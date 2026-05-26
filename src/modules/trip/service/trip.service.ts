import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository, EntityManager } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { Trip } from '@modules/core/entities/trip.entity';
import { Booking } from '@modules/core/entities/booking.entity';
import { Driver } from '@modules/core/entities/driver.entity';
import { Passenger } from '@modules/core/entities/passenger.entity';
import { Escrow } from '@modules/core/entities/escro.entity';
import { Coupon } from '@modules/core/entities/coupon.entity';
import { Notification } from '@modules/core/entities/notification.entity';

import { BookingStatus, CouponType, EscrowStatus, NotificationType, PaymentStatus, TripStatus } from '../../../types/enums';
import { PaymentFactory } from '@adapters/payment/payment.factory';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { ExpoService } from '@modules/notification/services/expo.service';

import {
  BookTripDto,
  CancelBookingDto,
  CancelTripDto,
  CompleteTripDto,
  CreateTripDto,
  SearchTripsDto,
  UpdateTripDto,
} from '../dtos/trip.dto';

/** Platform fee rate (deducted from driver payout) */
const PLATFORM_FEE_RATE = parseFloat(process.env.PLATFORM_FEE_RATE ?? '5'); // 5%

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Passenger) private readonly passengerRepo: Repository<Passenger>,
    @InjectRepository(Escrow) private readonly escrowRepo: Repository<Escrow>,
    @InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
    private readonly paymentFactory: PaymentFactory,
    private readonly randomnessUtil: RandomnessUtil,
    private readonly configService: ConfigService,
    private readonly expoService: ExpoService,
  ) {}

  // ─── Driver: Create trip ──────────────────────────────────────────────────

  async createTrip(userId: number, dto: CreateTripDto, em?: EntityManager): Promise<Trip> {
    const manager = em ?? this.tripRepo.manager;

    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const reference = this.randomnessUtil.generateReference('TRP');

    const trip = manager.create(Trip, {
      ...dto,
      reference,
      driverId: driver.id,
      status: TripStatus.PENDING,
      bookedSeats: 0,
    });

    const saved = await manager.save(Trip, trip);
    await this.notify(driver.userId, '🚌 Trip Created', `Your trip ${reference} to ${dto.destination} has been created.`, NotificationType.BROADCAST);
    return saved;
  }

  // ─── Driver: Activate/publish trip ───────────────────────────────────────

  async activateTrip(userId: number, tripId: number): Promise<Trip> {
    const trip = await this.getTripOwnedByDriver(userId, tripId);
    if (trip.status !== TripStatus.PENDING)
      throw new BadRequestException('Only pending trips can be activated');

    trip.status = TripStatus.ACTIVE;
    return this.tripRepo.save(trip);
  }

  // ─── Driver: Complete trip → release escrow ───────────────────────────────

  async completeTrip(userId: number, dto: CompleteTripDto, em?: EntityManager): Promise<Trip> {
    const manager = em ?? this.tripRepo.manager;

    const trip = await this.getTripOwnedByDriver(userId, dto.tripId);
    if (trip.status !== TripStatus.ACTIVE)
      throw new BadRequestException('Only active trips can be completed');

    trip.status = TripStatus.COMPLETED;
    if (dto.notes) trip.metadata = { ...(trip.metadata ?? {}), completionNotes: dto.notes };
    await manager.save(Trip, trip);

    // Release all held escrows for confirmed bookings on this trip
    await this.releaseEscrowsForTrip(trip.id, manager);

    // Mark all confirmed bookings as completed
    await manager.update(
      Booking,
      { tripId: trip.id, status: BookingStatus.CONFIRMED },
      { status: BookingStatus.COMPLETED },
    );

    await this.notify(
      userId,
      'Trip Completed',
      `Your trip to ${trip.destination} has been completed. Earnings have been credited to your wallet.`,
      NotificationType.TRIP_COMPLETED,
    );

    return trip;
  }

  // ─── Driver: Cancel trip → refund all bookings ────────────────────────────

  async cancelTrip(userId: number, dto: CancelTripDto, em?: EntityManager): Promise<Trip> {
    const manager = em ?? this.tripRepo.manager;

    const trip = await this.getTripOwnedByDriver(userId, dto.tripId);
    if (![TripStatus.PENDING, TripStatus.ACTIVE].includes(trip.status))
      throw new BadRequestException('Cannot cancel a completed or already-cancelled trip');

    trip.status = TripStatus.CANCELLED;
    trip.metadata = { ...(trip.metadata ?? {}), cancellationReason: dto.reason };
    await manager.save(Trip, trip);

    // Refund all confirmed/pending bookings
    const bookings = await this.bookingRepo.find({
      where: { tripId: trip.id },
      relations: ['passenger', 'passenger.user'],
    });

    for (const booking of bookings) {
      if ([BookingStatus.CONFIRMED, BookingStatus.PENDING].includes(booking.status)) {
        await this.refundBookingEscrow(booking, manager);
        booking.status = BookingStatus.CANCELLED;
        booking.metadata = { ...(booking.metadata ?? {}), cancelReason: dto.reason };
        await manager.save(Booking, booking);

        // Notify each affected passenger
        if (booking.passenger?.userId) {
          await this.notify(
            booking.passenger.userId,
            '⚠️ Trip Cancelled',
            `Your booking ${booking.bookingCode} was cancelled. A full refund has been initiated.`,
            NotificationType.TRIP_CANCELLED,
          );
        }
      }
    }

    return trip;
  }

  // ─── Driver: Update trip (before first booking only) ─────────────────────

  async updateTrip(userId: number, tripId: number, dto: UpdateTripDto): Promise<Trip> {
    const trip = await this.getTripOwnedByDriver(userId, tripId);

    const bookingCount = await this.bookingRepo.count({
      where: { tripId, status: BookingStatus.CONFIRMED },
    });
    if (bookingCount > 0)
      throw new BadRequestException('Cannot edit a trip that already has confirmed bookings');

    Object.assign(trip, dto);
    return this.tripRepo.save(trip);
  }

  // ─── Passenger: Search trips ──────────────────────────────────────────────

  async searchTrips(dto: SearchTripsDto) {
    const { page = 1, limit = 20, origin, destination, date, seats, maxPrice, sortBy, status } = dto;
    const skip = (page - 1) * limit;

    const qb = this.tripRepo.createQueryBuilder('trip')
      .leftJoinAndSelect('trip.driver', 'driver')
      .leftJoinAndSelect('driver.user', 'user')
      .leftJoinAndSelect('trip.vehicle', 'vehicle')
      .where('trip.status = :status', { status: status ?? TripStatus.ACTIVE });

    if (origin) qb.andWhere('trip.origin ILIKE :origin', { origin: `%${origin}%` });
    if (destination) qb.andWhere('trip.destination ILIKE :destination', { destination: `%${destination}%` });
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      qb.andWhere('trip.departureTime BETWEEN :start AND :end', { start, end });
    }
    if (seats) qb.andWhere('(trip.totalSeats - trip.bookedSeats) >= :seats', { seats });
    if (maxPrice) qb.andWhere('trip.pricePerSeat <= :maxPrice', { maxPrice });

    // Sorting
    switch (sortBy) {
      case 'price': qb.orderBy('trip.pricePerSeat', 'ASC'); break;
      case 'seats': qb.orderBy('(trip.totalSeats - trip.bookedSeats)', 'DESC'); break;
      default: qb.orderBy('trip.departureTime', 'ASC');
    }

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      data: data.map((t) => ({
        ...t,
        availableSeats: t.totalSeats - t.bookedSeats,
      })),
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  // ─── Passenger: Get single trip ───────────────────────────────────────────

  async getTripById(tripId: number) {
    const trip = await this.tripRepo.findOne({
      where: { id: tripId },
      relations: ['driver', 'driver.user', 'vehicle'],
    });
    if (!trip) throw new NotFoundException('Trip not found');
    return { ...trip, availableSeats: trip.totalSeats - trip.bookedSeats };
  }

  // ─── Passenger: Book trip → initiate payment → hold escrow ───────────────

  async bookTrip(userId: number, dto: BookTripDto, em?: EntityManager) {
    const manager = em ?? this.tripRepo.manager;

    const trip = await this.tripRepo.findOne({
      where: { id: dto.tripId },
      relations: ['driver', 'driver.user'],
    });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.status !== TripStatus.ACTIVE)
      throw new BadRequestException('This trip is not accepting bookings');

    const available = trip.totalSeats - trip.bookedSeats;
    if (dto.seats > available)
      throw new BadRequestException(`Only ${available} seat(s) available`);

    const passenger = await this.passengerRepo.findOne({
      where: { userId },
      relations: ['user'],
    });
    if (!passenger) throw new NotFoundException('Passenger profile not found');

    // Check for duplicate pending booking
    const existing = await this.bookingRepo.findOne({
      where: {
        tripId: trip.id,
        passengerId: passenger.id,
        status: BookingStatus.PENDING,
      },
    });
    if (existing) throw new BadRequestException('You already have a pending booking for this trip');

    // Apply coupon
    const { discountAmount, couponId } = await this.applyCoupon(dto.couponCode, trip.pricePerSeat * dto.seats);

    const totalAmount = trip.pricePerSeat * dto.seats;
    const amountPaid = totalAmount - discountAmount;
    const bookingCode = this.randomnessUtil.generateBookingCode(8);
    const paymentReference = this.randomnessUtil.generateReference('BKG');

    // Create booking (status: PENDING until payment confirmed)
    const booking = manager.create(Booking, {
      bookingCode,
      tripId: trip.id,
      passengerId: passenger.id,
      seats: dto.seats,
      totalAmount,
      discountAmount,
      amountPaid,
      status: BookingStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paymentReference,
      couponCode: dto.couponCode,
    });
    const savedBooking = await manager.save(Booking, booking);

    // Soft-lock seats (released if payment fails / expires)
    await manager.increment(Trip, { id: trip.id }, 'bookedSeats', dto.seats);

    // Increment coupon usage
    if (couponId) await manager.increment(Coupon, { id: couponId }, 'usageCount', 1);

    // Generate payment link
    const payment = await this.paymentFactory.initiatePayment({
      amount: amountPaid,
      email: passenger.user.email,
      reference: paymentReference,
      callback_url: dto.callbackUrl,
      metadata: {
        bookingCode,
        bookingId: savedBooking.id,
        tripId: trip.id,
        passengerId: passenger.id,
        driverId: trip.driverId,
        seats: dto.seats,
        type: 'trip_booking',
      },
    });

    await this.notify(
      userId,
      '🎟️ Booking Initiated',
      `Complete payment to confirm your booking ${bookingCode} for ${trip.origin} → ${trip.destination}.`,
      NotificationType.TRIP_BOOKED,
    );

    return {
      booking: savedBooking,
      payment,
      summary: {
        origin: trip.origin,
        destination: trip.destination,
        departureTime: trip.departureTime,
        seats: dto.seats,
        pricePerSeat: trip.pricePerSeat,
        totalAmount,
        discountAmount,
        amountPaid,
      },
    };
  }

  // ─── Called by webhook: payment confirmed → create escrow ─────────────────

  async confirmBookingPayment(
    bookingId: number,
    paymentReference: string,
    em?: EntityManager,
  ) {
    const manager = em ?? this.tripRepo.manager;

    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['trip', 'passenger', 'passenger.user'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status === BookingStatus.CONFIRMED) return booking; // idempotent

    booking.status = BookingStatus.CONFIRMED;
    booking.paymentStatus = PaymentStatus.SUCCESS;
    booking.paymentReference = paymentReference;
    await manager.save(Booking, booking);

    // Create escrow record
    const platformFee = (booking.amountPaid * PLATFORM_FEE_RATE) / 100;
    const netDriverAmount = booking.amountPaid - platformFee;
    const escrowRef = this.randomnessUtil.generateReference('ESC');

    await manager.save(Escrow, manager.create(Escrow, {
      reference: escrowRef,
      bookingId: booking.id,
      amount: booking.amountPaid,
      platformFee,
      netDriverAmount,
      status: EscrowStatus.HELD,
      driverId: booking.trip.driverId,
      passengerId: booking.passengerId,
      paymentReference,
    }));

    // Notify passenger
    await this.notify(
      booking.passenger.userId,
      '✅ Booking Confirmed',
      `Your booking ${booking.bookingCode} is confirmed! Funds held securely until trip completion.`,
      NotificationType.PAYMENT_SUCCESS,
    );

    // Notify driver
    await this.notify(
      booking.trip.driverId,
      '🎉 New Booking',
      `A passenger just booked ${booking.seats} seat(s) on your trip to ${booking.trip.destination}.`,
      NotificationType.TRIP_BOOKED,
      true, // driver lookup by driverId not userId — handled inside notify
    );

    return booking;
  }

  // ─── Passenger: Cancel booking ────────────────────────────────────────────

  async cancelBooking(userId: number, dto: CancelBookingDto, em?: EntityManager) {
    const manager = em ?? this.tripRepo.manager;

    const passenger = await this.passengerRepo.findOne({ where: { userId } });
    if (!passenger) throw new NotFoundException('Passenger profile not found');

    const booking = await this.bookingRepo.findOne({
      where: { id: dto.bookingId, passengerId: passenger.id },
      relations: ['trip'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (![BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(booking.status))
      throw new BadRequestException('This booking cannot be cancelled');

    // Check cancellation window (e.g. 2 hours before departure)
    const hoursBeforeDeparture =
      (new Date(booking.trip.departureTime).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursBeforeDeparture < 2)
      throw new BadRequestException('Cancellations must be made at least 2 hours before departure');

    booking.status = BookingStatus.CANCELLED;
    booking.metadata = { ...(booking.metadata ?? {}), cancelReason: dto.reason };
    await manager.save(Booking, booking);

    // Release locked seats
    await manager.decrement(Trip, { id: booking.tripId }, 'bookedSeats', booking.seats);

    // Process escrow refund if payment was made
    if (booking.paymentStatus === PaymentStatus.SUCCESS) {
      await this.refundBookingEscrow(booking, manager);
    }

    await this.notify(userId, '❌ Booking Cancelled', `Your booking ${booking.bookingCode} has been cancelled.`, NotificationType.TRIP_CANCELLED);

    return { message: 'Booking cancelled successfully', booking };
  }

  // ─── Get my bookings (passenger) ─────────────────────────────────────────

  async getMyBookings(userId: number, query: { page?: number; limit?: number; status?: string }) {
    const passenger = await this.passengerRepo.findOne({ where: { userId } });
    if (!passenger) throw new NotFoundException('Passenger profile not found');

    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const where: any = { passengerId: passenger.id };
    if (status) where.status = status;

    const [data, total] = await this.bookingRepo.findAndCount({
      where,
      skip,
      take: limit,
      relations: ['trip', 'trip.driver', 'trip.driver.user', 'trip.vehicle'],
      order: { createdAt: 'DESC' },
    });

    return { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  // ─── Get my trips (driver) ────────────────────────────────────────────────

  async getMyTrips(userId: number, query: { page?: number; limit?: number; status?: string }) {
    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const where: any = { driverId: driver.id };
    if (status) where.status = status;

    const [data, total] = await this.tripRepo.findAndCount({
      where,
      skip,
      take: limit,
      relations: ['vehicle'],
      order: { departureTime: 'DESC' },
    });

    return {
      data: data.map((t) => ({ ...t, availableSeats: t.totalSeats - t.bookedSeats })),
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  // ─── Get trip bookings (driver) ───────────────────────────────────────────

  async getTripBookings(userId: number, tripId: number) {
    await this.getTripOwnedByDriver(userId, tripId);

    return this.bookingRepo.find({
      where: { tripId },
      relations: ['passenger', 'passenger.user'],
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Driver: Check-in passenger ──────────────────────────────────────────

  async checkInPassenger(userId: number, bookingId: number) {
    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['trip'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.trip.driverId !== driver.id)
      throw new ForbiddenException('This booking is not on your trip');
    if (booking.status !== BookingStatus.CONFIRMED)
      throw new BadRequestException('Passenger must have a confirmed booking to check in');

    booking.isCheckedIn = true;
    booking.checkedInAt = new Date();
    return this.bookingRepo.save(booking);
  }

  // ─── Get booking detail ───────────────────────────────────────────────────

  async getBookingByCode(bookingCode: string, userId: number) {
    const passenger = await this.passengerRepo.findOne({ where: { userId } });
    const booking = await this.bookingRepo.findOne({
      where: { bookingCode },
      relations: ['trip', 'trip.driver', 'trip.driver.user', 'trip.vehicle'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (passenger && booking.passengerId !== passenger.id)
      throw new ForbiddenException('This booking does not belong to you');
    return booking;
  }

  // ─── Internal: release escrows on trip completion ────────────────────────

  private async releaseEscrowsForTrip(tripId: number, manager: EntityManager) {
    const escrows = await this.escrowRepo.find({
      where: {
        status: EscrowStatus.HELD,
      },
      relations: ['booking'],
    });

    const tripEscrows = escrows.filter((e) => e.booking?.tripId === tripId);

    for (const escrow of tripEscrows) {
      escrow.status = EscrowStatus.RELEASED;
      escrow.releasedAt = new Date();
      escrow.releaseReason = 'Trip completed';
      await manager.save(Escrow, escrow);

      // Credit driver wallet
      await manager.increment(Driver, { id: escrow.driverId }, 'walletBalance', Number(escrow.netDriverAmount));

      this.logger.log(`Escrow ${escrow.reference} released → driver ${escrow.driverId} +${escrow.netDriverAmount}`);
    }
  }

  // ─── Internal: refund escrow for cancelled booking ────────────────────────

  private async refundBookingEscrow(booking: Booking, manager: EntityManager) {
    const escrow = await this.escrowRepo.findOne({ where: { bookingId: booking.id } });
    if (!escrow || escrow.status !== EscrowStatus.HELD) return;

    // Initiate Paystack refund
    try {
      await this.paymentFactory['paystackAdapter']?.initiateRefund?.(
        booking.paymentReference,
        booking.amountPaid,
      );
    } catch (err) {
      this.logger.error(`Refund failed for booking ${booking.bookingCode}`, err);
    }

    escrow.status = EscrowStatus.REFUNDED;
    escrow.refundedAt = new Date();
    await manager.save(Escrow, escrow);
  }

  // ─── Internal: apply coupon ───────────────────────────────────────────────

  private async applyCoupon(
    code: string | undefined,
    subtotal: number,
  ): Promise<{ discountAmount: number; couponId?: number }> {
    if (!code) return { discountAmount: 0 };

    const coupon = await this.couponRepo.findOne({
      where: { code: code.toUpperCase(), isActive: true },
    });
    if (!coupon) return { discountAmount: 0 };

    if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) return { discountAmount: 0 };
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return { discountAmount: 0 };
    if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) return { discountAmount: 0 };

    let discountAmount =
      coupon.type === CouponType.PERCENTAGE
        ? (subtotal * Number(coupon.value)) / 100
        : Number(coupon.value);

    if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
    discountAmount = Math.min(discountAmount, subtotal);

    return { discountAmount, couponId: coupon.id };
  }

  // ─── Internal: get trip owned by driver or throw ──────────────────────────

  private async getTripOwnedByDriver(userId: number, tripId: number): Promise<Trip> {
    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const trip = await this.tripRepo.findOne({ where: { id: tripId, driverId: driver.id } });
    if (!trip) throw new NotFoundException('Trip not found or does not belong to you');
    return trip;
  }

  // ─── Internal: send in-app notification ──────────────────────────────────

  private async notify(
    userId: number,
    title: string,
    body: string,
    type: NotificationType,
    isDriverId = false,
  ) {
    try {
      let targetUserId = userId;
      if (isDriverId) {
        const driver = await this.driverRepo.findOne({ where: { id: userId } });
        if (driver) targetUserId = driver.userId;
      }

      const notif = this.notifRepo.create({ userId: targetUserId, title, body, type });
      await this.notifRepo.save(notif);
    } catch (err) {
      this.logger.warn('Notification save failed', err?.message);
    }
  }
}