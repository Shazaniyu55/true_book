import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { Review } from '@modules/core/entities/review.entity';
import { Booking } from '@modules/core/entities/booking.entity';
import { Passenger } from '@modules/core/entities/passenger.entity';
import { Driver } from '@modules/core/entities/driver.entity';
import { BookingStatus } from 'src/types/enums';
import { CreateReviewDto, ReviewListQueryDto } from '../dto/review.dto';
import { PagedDto } from '@shared/interface/paged.interface';

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Passenger) private readonly passengerRepo: Repository<Passenger>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
  ) {}

  // ─── Passenger: create a review ───────────────────────────────────────────

  async createReview(
    userId: string,
    dto: CreateReviewDto,
    entityManager?: EntityManager,
  ): Promise<Review> {
    const manager = entityManager ?? this.reviewRepo.manager;

    // The reviewer must own the booking
    const passenger = await this.passengerRepo.findOne({ where: { userId } });
    if (!passenger) throw new NotFoundException('Passenger profile not found');

    const booking = await this.bookingRepo.findOne({
      where: { id: dto.bookingId },
      relations: ['trip'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.passengerId !== passenger.id)
      throw new ForbiddenException('This booking does not belong to you');
    if (booking.status !== BookingStatus.COMPLETED)
      throw new BadRequestException('You can only review a completed trip');

    // One review per booking
    const existing = await this.reviewRepo.findOne({ where: { bookingId: booking.id } });
    if (existing) throw new ConflictException('You have already reviewed this trip');

    const driverId = booking.trip?.driverId;
    if (!driverId) throw new BadRequestException('Trip has no driver to review');

    const review = manager.create(Review, {
      bookingId: booking.id,
      tripId: booking.tripId,
      driverId,
      passengerId: passenger.id,
      rating: dto.rating,
      comment: dto.comment ?? null,
      isVisible: true,
    });
    const saved = await manager.save(Review, review);

    // Recompute the driver aggregate inside the same transaction
    await this.recalculateDriverRating(driverId, manager);

    this.logger.log(`Review ${saved.id} created for driver ${driverId} — rating ${dto.rating}`);
    return saved;
  }

  // ─── Public: list a driver's reviews ──────────────────────────────────────

  async getDriverReviews(driverId: string, query: ReviewListQueryDto): Promise<PagedDto<any>> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await this.reviewRepo.findAndCount({
      where: { driverId, isVisible: true },
      relations: ['passenger', 'passenger.user'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return this.toPaged(data, total, page, limit, skip);
  }

  // ─── Public: rating summary for a driver ──────────────────────────────────

  async getDriverRatingSummary(driverId: string) {
    const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Driver not found');

    const rows = await this.reviewRepo
      .createQueryBuilder('r')
      .select('r.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('r.driverId = :driverId AND r.isVisible = true', { driverId })
      .groupBy('r.rating')
      .getRawMany();

    return {
      averageRating: Number(driver.averageRating ?? 0),
      ratingCount: driver.ratingCount ?? 0,
      breakdown: [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: Number(rows.find((b) => Number(b.rating) === star)?.count ?? 0),
      })),
    };
  }

  // ─── Passenger: reviews I have written ────────────────────────────────────

  async getMyReviews(userId: string, query: ReviewListQueryDto): Promise<PagedDto<any>> {
    const passenger = await this.passengerRepo.findOne({ where: { userId } });
    if (!passenger) throw new NotFoundException('Passenger profile not found');

    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await this.reviewRepo.findAndCount({
      where: { passengerId: passenger.id },
      relations: ['trip', 'driver', 'driver.user'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return this.toPaged(data, total, page, limit, skip);
  }

  // ─── Internal: recompute driver averageRating + ratingCount ───────────────

  private async recalculateDriverRating(driverId: string, manager: EntityManager): Promise<void> {
    const { avg, count } = await manager
      .createQueryBuilder(Review, 'r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.driverId = :driverId AND r.isVisible = true', { driverId })
      .getRawOne();

    await manager.update(Driver, driverId, {
      averageRating: avg ? parseFloat(parseFloat(avg).toFixed(2)) : 0,
      ratingCount: parseInt(count ?? '0', 10),
    });
  }

  // ─── Internal: PagedDto helper ────────────────────────────────────────────

  private toPaged(data: any[], total: number, page: number, limit: number, skip: number): PagedDto<any> {
    const pagedDto = new PagedDto();
    pagedDto.data = data;
    pagedDto.meta = {
      page,
      limit,
      count: data.length,
      previousPage: page > 1 ? page - 1 : false,
      nextPage: skip + limit < total ? page + 1 : false,
      pageCount: Math.ceil(total / limit),
      totalRecords: total,
    };
    return pagedDto;
  }
}