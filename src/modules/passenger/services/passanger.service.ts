import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Passenger } from '@modules/core/entities/passenger.entity';
import { User } from '@modules/core/entities/user.entity';
import { Booking } from '@modules/core/entities/booking.entity';
import { BookingStatus } from '../../../types/enums';
import { UpdatePassengerProfileDto } from '../dtos/passanger.dto';

@Injectable()
export class PassengerService {
  constructor(
    @InjectRepository(Passenger) private readonly passengerRepo: Repository<Passenger>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // PROFILE
  // ══════════════════════════════════════════════════════════════════════════

  async getProfile(userId: number) {
    const passenger = await this.passengerRepo.findOne({
      where: { userId },
      relations: ['user'],
    });
    if (!passenger) throw new NotFoundException('Passenger profile not found');
    return passenger;
  }

  async updateProfile(userId: number, dto: UpdatePassengerProfileDto) {
    const passenger = await this.passengerRepo.findOne({ where: { userId } });
    if (!passenger) throw new NotFoundException('Passenger profile not found');

    // Update User fields
    const userUpdates: Partial<User> = {};
    if (dto.firstName) userUpdates.firstName = dto.firstName;
    if (dto.lastName) userUpdates.lastName = dto.lastName;
    if (dto.phone) userUpdates.phone = dto.phone;
    if (dto.profilePhoto) userUpdates.profilePhoto = dto.profilePhoto;
    if (Object.keys(userUpdates).length) {
      await this.userRepo.update(userId, userUpdates);
    }

    // Update Passenger-specific fields
    if (dto.state) {
      await this.passengerRepo.update(passenger.id, {
        metadata: { ...(passenger.metadata ?? {}), state: dto.state },
      } as any);
    }

    return this.getProfile(userId);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════

  async getDashboard(userId: number) {
    const passenger = await this.passengerRepo.findOne({
      where: { userId },
      relations: ['user'],
    });
    if (!passenger) throw new NotFoundException('Passenger profile not found');

    const [total, confirmed, completed, cancelled, pending] = await Promise.all([
      this.bookingRepo.count({ where: { passengerId: passenger.id } }),
      this.bookingRepo.count({ where: { passengerId: passenger.id, status: BookingStatus.CONFIRMED } }),
      this.bookingRepo.count({ where: { passengerId: passenger.id, status: BookingStatus.COMPLETED } }),
      this.bookingRepo.count({ where: { passengerId: passenger.id, status: BookingStatus.CANCELLED } }),
      this.bookingRepo.count({ where: { passengerId: passenger.id, status: BookingStatus.PENDING } }),
    ]);

    // Recent bookings (last 5)
    const recentBookings = await this.bookingRepo.find({
      where: { passengerId: passenger.id },
      relations: ['trip', 'trip.driver', 'trip.driver.user'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      profile: passenger,
      bookings: { total, confirmed, completed, cancelled, pending },
      recentBookings,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CALLED BY AUTH — ensure passenger profile exists after registration
  // ══════════════════════════════════════════════════════════════════════════

async ensureProfile(userId: number): Promise<Passenger> {
  const existing = await this.passengerRepo.findOne({ where: { userId } });
  if (existing) return existing;

  return this.passengerRepo.save(
    this.passengerRepo.create({ userId } as any),
  ) as unknown as Passenger;
}

}