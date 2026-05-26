import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';

import { Trip } from '@modules/core/entities/trip.entity';
import { Driver } from '@modules/core/entities/driver.entity';
import { Booking } from '@modules/core/entities/booking.entity';
import { Escrow } from '@modules/core/entities/escro.entity';

import { TripStatus, BookingStatus, EscrowStatus  } from '../../../types/enums';
import { CreateDriverTripDto, UpdateDriverTripDto, CancelDriverTripDto, CompleteDriverTripDto } from '../dtos/create-driver.dto';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CREATE TRIP USE CASE
 * ═══════════════════════════════════════════════════════════════════════════
 */

@Injectable()
export class CreateDriverTripUseCase {
  private readonly logger = new Logger(CreateDriverTripUseCase.name);

  constructor(
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    private readonly randomnessUtil: RandomnessUtil,
  ) {}

  async execute(userId: number, dto: CreateDriverTripDto, em?: EntityManager): Promise<Trip> {
    const manager = em ?? this.tripRepo.manager;

    // Validate driver exists
    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (!driver) {
      this.logger.warn(`Driver not found for userId: ${userId}`);
      throw new NotFoundException('Driver profile not found');
    }

    // Validate trip data
    this.validateTripData(dto);

    // Generate unique reference
    const reference = this.randomnessUtil.generateReference('TRP');

    // Create trip entity
    const trip = manager.create(Trip, {
      origin: dto.origin.trim(),
      destination: dto.destination.trim(),
      departureTime: new Date(dto.departureTime),
      totalSeats: dto.totalSeats,
      pricePerSeat: dto.pricePerSeat,
      description: dto.description?.trim() || null,
      vehicleId: dto.vehicleId ? Number(dto.vehicleId) : null,
      reference,
      driverId: driver.id,
      status: TripStatus.PENDING,
      bookedSeats: 0,
      amenities: dto.amenities ? this.parseAmenities(dto.amenities) : null,
      metadata: dto.metadata || { createdFrom: 'driver_portal' },
    });

    const savedTrip = await manager.save(Trip, trip);

    this.logger.log(
      `Trip created successfully: ${reference} by driver ${driver.id}`,
    );

    return savedTrip;
  }

  private validateTripData(dto: CreateDriverTripDto): void {
    const departureDate = new Date(dto.departureTime);
    const now = new Date();

    // Departure must be in the future
    if (departureDate <= now) {
      throw new BadRequestException('Departure time must be in the future');
    }

    // Minimum advance notice (2 hours)
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    if (departureDate < twoHoursFromNow) {
      throw new BadRequestException('Trip must be created at least 2 hours before departure');
    }

    // Origin and destination must be different
    if (dto.origin.toLowerCase() === dto.destination.toLowerCase()) {
      throw new BadRequestException('Origin and destination must be different');
    }

    // Validate price is reasonable (min 100, max 50000)
    if (dto.pricePerSeat < 100 || dto.pricePerSeat > 50000) {
      throw new BadRequestException('Price per seat must be between 100 and 50000');
    }

    // Validate seats
    if (dto.totalSeats < 1 || dto.totalSeats > 50) {
      throw new BadRequestException('Total seats must be between 1 and 50');
    }
  }

  private parseAmenities(amenitiesInput: string): string[] {
    if (!amenitiesInput) return [];
    try {
      if (amenitiesInput.startsWith('[')) {
        return JSON.parse(amenitiesInput);
      }
      return amenitiesInput.split(',').map(a => a.trim()).filter(a => a);
    } catch {
      return amenitiesInput.split(',').map(a => a.trim()).filter(a => a);
    }
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UPDATE TRIP USE CASE
 * ═══════════════════════════════════════════════════════════════════════════
 */

@Injectable()
export class UpdateDriverTripUseCase {
  private readonly logger = new Logger(UpdateDriverTripUseCase.name);

  constructor(
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
  ) {}

  async execute(userId: number, tripId: number, dto: UpdateDriverTripDto, em?: EntityManager): Promise<Trip> {
    const manager = em ?? this.tripRepo.manager;

    // Validate driver and ownership
    const trip = await this.getTripOwnedByDriver(userId, tripId);

    // Only allow updates on PENDING trips
    if (trip.status !== TripStatus.PENDING) {
      throw new BadRequestException('Can only update trips in PENDING status');
    }

    // Check for confirmed bookings
    const confirmedCount = await this.bookingRepo.count({
      where: { tripId, status: BookingStatus.CONFIRMED },
    });

    if (confirmedCount > 0) {
      throw new BadRequestException('Cannot edit a trip that already has confirmed bookings');
    }

    // Validate update data
    if (dto.departureTime) {
      this.validateDepartureTime(dto.departureTime);
    }

    if (dto.pricePerSeat && (dto.pricePerSeat < 100 || dto.pricePerSeat > 50000)) {
      throw new BadRequestException('Price per seat must be between 100 and 50000');
    }

    // Apply updates
    const updates = {
      ...dto,
      departureTime: dto.departureTime ? new Date(dto.departureTime) : trip.departureTime,
      amenities: dto.amenities ? this.parseAmenities(dto.amenities) : trip.amenities,
    };

    Object.assign(trip, updates);
    const updated = await manager.save(Trip, trip);

    this.logger.log(`Trip ${tripId} updated by driver ${userId}`);
    return updated;
  }

  private validateDepartureTime(departureTime: string): void {
    const departureDate = new Date(departureTime);
    const now = new Date();

    if (departureDate <= now) {
      throw new BadRequestException('Departure time must be in the future');
    }

    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    if (departureDate < twoHoursFromNow) {
      throw new BadRequestException('Trip must be at least 2 hours in the future');
    }
  }

  private parseAmenities(amenitiesInput: string): string[] {
    if (!amenitiesInput) return [];
    try {
      if (amenitiesInput.startsWith('[')) {
        return JSON.parse(amenitiesInput);
      }
      return amenitiesInput.split(',').map(a => a.trim()).filter(a => a);
    } catch {
      return amenitiesInput.split(',').map(a => a.trim()).filter(a => a);
    }
  }

  private async getTripOwnedByDriver(userId: number, tripId: number): Promise<Trip> {
    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const trip = await this.tripRepo.findOne({
      where: { id: tripId, driverId: driver.id },
    });
    if (!trip) throw new NotFoundException('Trip not found or does not belong to you');
    return trip;
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ACTIVATE TRIP USE CASE
 * ═══════════════════════════════════════════════════════════════════════════
 */

@Injectable()
export class ActivateDriverTripUseCase {
  private readonly logger = new Logger(ActivateDriverTripUseCase.name);

  constructor(
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
  ) {}

  async execute(userId: number, tripId: number, em?: EntityManager): Promise<Trip> {
    const manager = em ?? this.tripRepo.manager;

    const trip = await this.getTripOwnedByDriver(userId, tripId);

    if (trip.status !== TripStatus.PENDING) {
      throw new BadRequestException(
        `Cannot activate trip. Current status: ${trip.status}. Only PENDING trips can be activated.`,
      );
    }

    const departureDate = new Date(trip.departureTime);
    const now = new Date();

    if (departureDate <= now) {
      throw new BadRequestException('Cannot activate a trip that has already departed or expired');
    }

    trip.status = TripStatus.ACTIVE;
    const updated = await manager.save(Trip, trip);

    this.logger.log(`Trip ${tripId} activated by driver ${userId}`);
    return updated;
  }

  private async getTripOwnedByDriver(userId: number, tripId: number): Promise<Trip> {
    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const trip = await this.tripRepo.findOne({
      where: { id: tripId, driverId: driver.id },
    });
    if (!trip) throw new NotFoundException('Trip not found or does not belong to you');
    return trip;
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CANCEL TRIP USE CASE
 * ═══════════════════════════════════════════════════════════════════════════
 */

@Injectable()
export class CancelDriverTripUseCase {
  private readonly logger = new Logger(CancelDriverTripUseCase.name);

  constructor(
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Escrow) private readonly escrowRepo: Repository<Escrow>,
  ) {}

  async execute(userId: number, tripId: number, dto: CancelDriverTripDto, em?: EntityManager): Promise<{
    trip: Trip;
    refundedBookings: number;
    totalRefundAmount: number;
  }> {
    const manager = em ?? this.tripRepo.manager;

    const trip = await this.getTripOwnedByDriver(userId, tripId);

    if (![TripStatus.PENDING, TripStatus.ACTIVE].includes(trip.status)) {
      throw new BadRequestException(
        `Cannot cancel a trip with status: ${trip.status}. Only PENDING or ACTIVE trips can be cancelled.`,
      );
    }

    // Validate cancellation reason
    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new BadRequestException('Cancellation reason is required');
    }

    trip.status = TripStatus.CANCELLED;
    trip.metadata = {
      ...trip.metadata,
      cancellationReason: dto.reason.trim(),
      additionalNotes: dto.additionalNotes?.trim() || null,
      cancelledAt: new Date().toISOString(),
      cancelledBy: userId,
    };

    await manager.save(Trip, trip);

    // Get all bookings for this trip
    const bookings = await this.bookingRepo.find({
      where: { tripId: trip.id },
      relations: ['passenger', 'passenger.user'],
    });

    let refundedCount = 0;
    let totalRefundAmount = 0;

    // Process refunds for PENDING and CONFIRMED bookings
    for (const booking of bookings) {
      if ([BookingStatus.CONFIRMED, BookingStatus.PENDING].includes(booking.status)) {
        // Mark booking as cancelled
        booking.status = BookingStatus.CANCELLED;
        booking.metadata = {
          ...booking.metadata,
          cancelReason: dto.reason.trim(),
          cancelledAt: new Date().toISOString(),
          refundReason: 'Trip cancelled by driver',
        };

        await manager.save(Booking, booking);

        // Process escrow refund if payment was successful
        if (booking.paymentStatus === 'success') {
          const refundAmount = await this.processRefund(booking.id, manager);
          totalRefundAmount += refundAmount;
        }

        refundedCount++;
      }
    }

    this.logger.log(
      `Trip ${tripId} cancelled by driver ${userId}. Refunded ${refundedCount} bookings. Total: ${totalRefundAmount}`,
    );

    return {
      trip,
      refundedBookings: refundedCount,
      totalRefundAmount,
    };
  }

  private async processRefund(bookingId: number, manager: EntityManager): Promise<number> {
    const escrow = await this.escrowRepo.findOne({
      where: { bookingId },
      relations: ['booking'],
    });

    if (!escrow) {
      return 0;
    }

    if (escrow.status === EscrowStatus.HELD) {
      escrow.status = EscrowStatus.REFUNDED;
      escrow.refundedAt = new Date();
      await manager.save(Escrow, escrow);
      return Number(escrow.amount) || 0;
    }

    return 0;
  }

  private async getTripOwnedByDriver(userId: number, tripId: number): Promise<Trip> {
    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const trip = await this.tripRepo.findOne({
      where: { id: tripId, driverId: driver.id },
    });
    if (!trip) throw new NotFoundException('Trip not found or does not belong to you');
    return trip;
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPLETE TRIP USE CASE
 * ═══════════════════════════════════════════════════════════════════════════
 */

@Injectable()
export class CompleteDriverTripUseCase {
  private readonly logger = new Logger(CompleteDriverTripUseCase.name);

  constructor(
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Escrow) private readonly escrowRepo: Repository<Escrow>,
  ) {}

  async execute(userId: number, tripId: number, dto: CompleteDriverTripDto, em?: EntityManager): Promise<{
    trip: Trip;
    completedBookings: number;
    totalEarnings: number;
    platformFee: number;
    netEarnings: number;
  }> {
    const manager = em ?? this.tripRepo.manager;

    const trip = await this.getTripOwnedByDriver(userId, tripId);

    if (trip.status !== TripStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot complete a trip with status: ${trip.status}. Only ACTIVE trips can be completed.`,
      );
    }

    trip.status = TripStatus.COMPLETED;
    if (dto.notes) {
      trip.metadata = {
        ...trip.metadata,
        completionNotes: dto.notes.trim(),
        completedAt: new Date().toISOString(),
      };
    }

    await manager.save(Trip, trip);

    // Release all escrows and mark bookings as completed
    const { completedCount, totalEarnings, platformFeeTotal } = await this.releaseEscrowsForTrip(
      trip.id,
      manager,
    );

    // Mark all confirmed bookings as completed
    await manager.update(
      Booking,
      { tripId: trip.id, status: BookingStatus.CONFIRMED },
      { status: BookingStatus.COMPLETED },
    );

    const netEarnings = totalEarnings - platformFeeTotal;

    this.logger.log(
      `Trip ${tripId} completed by driver ${userId}. Completed ${completedCount} bookings. Earnings: ${totalEarnings}`,
    );

    return {
      trip,
      completedBookings: completedCount,
      totalEarnings,
      platformFee: platformFeeTotal,
      netEarnings,
    };
  }

  private async releaseEscrowsForTrip(
    tripId: number,
    manager: EntityManager,
  ): Promise<{ completedCount: number; totalEarnings: number; platformFeeTotal: number }> {
    const escrows = await this.escrowRepo.find({
      where: { status: EscrowStatus.HELD },
      relations: ['booking'],
    });

    const tripEscrows = escrows.filter((e) => e.booking?.tripId === tripId);

    let completedCount = 0;
    let totalEarnings = 0;
    let platformFeeTotal = 0;

    for (const escrow of tripEscrows) {
      escrow.status = EscrowStatus.RELEASED;
      escrow.releasedAt = new Date();
      escrow.releaseReason = 'Trip completed';
      await manager.save(Escrow, escrow);

      // Credit driver wallet
      await manager.increment(
        Driver,
        { id: escrow.driverId },
        'walletBalance',
        Number(escrow.netDriverAmount),
      );

      completedCount++;
      totalEarnings += Number(escrow.amount) || 0;
      platformFeeTotal += Number(escrow.platformFee) || 0;

      this.logger.log(
        `Escrow ${escrow.reference} released → driver ${escrow.driverId} +${escrow.netDriverAmount}`,
      );
    }

    return { completedCount, totalEarnings, platformFeeTotal };
  }

  private async getTripOwnedByDriver(userId: number, tripId: number): Promise<Trip> {
    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const trip = await this.tripRepo.findOne({
      where: { id: tripId, driverId: driver.id },
    });
    if (!trip) throw new NotFoundException('Trip not found or does not belong to you');
    return trip;
  }
}