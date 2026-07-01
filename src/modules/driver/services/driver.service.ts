import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Trip } from '@modules/core/entities/trip.entity';
import { CreateDriverTripDto, UpdateDriverTripDto, CancelDriverTripDto, CompleteDriverTripDto } from '../dtos/create-driver.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Driver } from '@modules/core/entities/driver.entity';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { BookingStatus, EscrowStatus, NotificationType, TripStatus } from 'src/types/enums';
import { Booking } from '@modules/core/entities/booking.entity';
import { Escrow } from '@modules/core/entities/escro.entity';
import { Vehicle } from '@modules/core/entities/vehicle.entity';
import { NotificationService } from '@modules/notification/services/notification.service';
import { CloudinaryService } from '@modules/cloudinary/services/cloudinary.service';
import { DriverRepository } from '@adapters/repositories/driver.repository';
import { UpdateDriverProfileDto } from '../dtos/updatedriver.dto';
import { VehicleType } from '@modules/core/entities/vehicletype.entity';
import { RedisCacheService } from '@modules/cache/redis-cache.service';
import { CACHE_KEYS, CACHE_TTL } from '@modules/cache/redis-cache.constants';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DRIVER TRIP SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * High-level service orchestrating use cases for driver trip management.
 * Acts as a facade to the underlying use cases and business logic.
 */

@Injectable()
export class DriverTripService {
  private readonly logger = new Logger(DriverTripService.name);

  constructor(

    private readonly randomnessUtil: RandomnessUtil,
    
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Escrow) private readonly escrowRepo: Repository<Escrow>,
    @InjectRepository(Vehicle) private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(VehicleType) private readonly vehicleTypeRepo: Repository<VehicleType>,
    
    private readonly notifiyService:NotificationService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly driverRepository: DriverRepository,
    private readonly cache: RedisCacheService, 
    
    
    

    
    
    
  ) {}

  /**
   * Create a new trip
   */
  async createTrip(userId: string, dto: CreateDriverTripDto, em?: EntityManager): Promise<Trip> {
    this.logger.debug(`Creating trip for driver ${userId}`);
    const manager = em ?? this.tripRepo.manager;
        // Validate driver exists
        const driver = await this.driverRepo.findOne({ where: { userId } });
        if (!driver) {
          this.logger.warn(`Driver not found for userId: ${userId}`);
          throw new NotFoundException('Driver profile not found');
        }

        // ── Eligibility checks ──────────────────────────────────────────
if (!driver.licenseVerified) {
  throw new BadRequestException(
    "Please verify your driver's license before creating a trip",
  );
}



const vehicle = await this.vehicleRepo.findOne({
  where: { driverId: driver.id  },
});
if (!vehicle) {
  throw new BadRequestException(
    'Please register a vehicle before creating a trip',
  );
}

if (!vehicle.isVerified) {
  throw new BadRequestException(
    'Your vehicle is pending verification. You can create trips once it is approved.',
  );
}

    // Validate trip data
    this.validateTripData(dto);

      // Generate unique reference
    const reference = this.randomnessUtil.generateReference('TRP');

     // Create trip entity
     const trip = this.tripRepo.create({
  reference,                                  
  driverId: driver.id,
  departureDate: dto.departureDate,
  departureTime: dto.departureTime,
  departureLocation: dto.departureLocation,
  departureLatlong: dto.departureLatlong,
  arrivalDate: dto.arrivalDate,
  arrivalTime: dto.arrivalTime,
  arrivalDestination: dto.arrivalDestination,
  pickStation: dto.pickStation,
  dropOffStation: dto.dropOffStation,
  busStop: dto.busStop,
  busstopLatlong: dto.busstopLatlong,
  tripSpecification: dto.tripSpecification,
  waypoints: dto.waypoints,                   // ← entity has it
  state: dto.state,
  description: dto.description,               // ← entity has it
  amenities: dto.amenities,                   // ← entity has it (string[])
  metadata: dto.metadata,                     // ← entity has it
  bookingClosingDate: dto.bookingClosingDate,
  bookingClosingTime: dto.bookingClosingTime,
  price: dto.price,
  vehicleId: dto.vehicleId,
  totalSeats: dto.totalSeats,                 // ← from DTO now
  availableSeats: dto.availableSeats,         // ← from DTO now
  status: TripStatus.ACTIVE,
});

         //await this.tripRepo.save(trip);
    
        const savedTrip = await manager.save(Trip, trip);
        
        this.logger.log(
          `Trip created successfully: ${reference} by driver ${driver.id}`,
        );

        // Notify the driver
await this.notifiyService.notify({
  userId: userId,                          // driver's userId
  title: 'Trip Created Successfully',
  body: `Your trip (${reference}) from ${dto.departureLocation} to ${dto.dropOffStation} has been created and is pending approval.`,
  type: NotificationType.TRIP_CREATED,    
  data: {
    tripId: savedTrip.id,
    reference: savedTrip.reference,
    status: savedTrip.status,
  },
});

// Notify all admins for review/approval
// await this.notifiyService.notifyAdmins({
//   title: 'New Trip Pending Approval',
//   body: `Driver ${driver.id} submitted trip ${reference} from ${dto.departureLocation} to ${dto.arrivalDestination}.`,
//   type: NotificationType.TRIP_CREATED,
//   data: {
//     tripId: savedTrip.id,
//     reference: savedTrip.reference,
//     driverId: driver.id,
//   },
// });

    
        return savedTrip;

  }

   async updateProfile(
      id: string,
      dto: UpdateDriverProfileDto,
      entityManager?: EntityManager,
    ) {
     
      return this.driverRepository.updateDriver(id, dto, entityManager);
    }

    

  /**
   * Update trip details (only PENDING trips)
   */
  async updateTrip(userId: string, tripId: string, dto: UpdateDriverTripDto, em?: EntityManager): Promise<Trip> {
    this.logger.debug(`Updating trip ${tripId} for driver ${userId}`);
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

  async getVehicleType(): Promise<VehicleType[]>{
      return this.driverRepository.getVehicleType()
  }

  /**
   * Activate trip (publish for bookings)
   */
  async activateTrip(userId: string, tripId: string, em?: EntityManager): Promise<Trip> {
    this.logger.debug(`Activating trip ${tripId} for driver ${userId}`);
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

  /**
   * Cancel trip (with refunds)
   */
  async cancelTrip(
    userId: string,
    tripId: string,
    dto: CancelDriverTripDto,
    em?: EntityManager,
  ): Promise<{
    trip: Trip;
    refundedBookings: number;
    totalRefundAmount: number;
  }> {
    this.logger.debug(`Cancelling trip ${tripId} for driver ${userId}`);
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

  /**
   * Complete trip (release escrows & mark as completed)
   */
  async completeTrip(
    userId: string,
    tripId: string,
    dto: CompleteDriverTripDto,
    em?: EntityManager,
  ): Promise<{
    trip: Trip;
    completedBookings: number;
    totalEarnings: number;
    platformFee: number;
    netEarnings: number;
  }> {
    this.logger.debug(`Completing trip ${tripId} for driver ${userId}`);
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

async getDriverTripStatus(userId: string, type?: string) {
  return this.driverRepository.getDriverTripStatus(userId, type);
}

async getDriverDashboard(userId: string, query: { page?: number; limit?: number }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const key = `${CACHE_KEYS.DRIVER_DASHBOARD_STATS}:${userId}:${page}:${limit}`;
  
 return this.cache.getOrSet(
      key,
      () => this.driverRepository.getDriverDashboard(userId, query),
      CACHE_TTL.MEDIUM,
    );
  //return this.driverRepository.getDriverDashboard(userId, query);
}

  async getProfile(id: string) {
    return await this.driverRepository.getProfile(id);
  }

  //---------------Private Helper Method-----------// 
 private validateTripData(dto: CreateDriverTripDto): void {
  // Combine the date and time into one real timestamp
  const departure = new Date(`${dto.departureDate}T${dto.departureTime}:00`);
  const now = new Date();

  // Guard against an unparseable date
  if (isNaN(departure.getTime())) {
    throw new BadRequestException('Invalid departure date or time');
  }

  // Departure must be in the future
  if (departure <= now) {
    throw new BadRequestException('Departure time must be in the future');
  }

  // Minimum advance notice (2 hours)
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  if (departure < twoHoursFromNow) {
    throw new BadRequestException('Trip must be created at least 2 hours before departure');
  }

  // Origin and destination must be different — but only if BOTH were provided
  if (
    dto.pickStation &&
    dto.dropOffStation &&
    dto.pickStation.toLowerCase() === dto.dropOffStation.toLowerCase()
  ) {
    throw new BadRequestException('Origin and destination must be different');
  }

  // Price (min 100, max 50000)
  if (dto.price < 100 || dto.price > 50000) {
    throw new BadRequestException('Price per seat must be between 100 and 50000');
  }

  // Seats
  if (dto.availableSeats < 1 || dto.availableSeats > 50) {
    throw new BadRequestException('Total seats must be between 1 and 50');
  }
}

    //-------------Private Helper method-----------// 
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

  //------- private helper method ------//
    private async getTripOwnedByDriver(userId: string, tripId: string): Promise<Trip> {
    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const trip = await this.tripRepo.findOne({
      where: { id: tripId, driverId: driver.id },
    });
    if (!trip) throw new NotFoundException('Trip not found or does not belong to you');
    return trip;
  }

  // --------- //
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

    private async processRefund(bookingId: string, manager: EntityManager): Promise<number> {
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

    private async releaseEscrowsForTrip(
    tripId: string,
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
        'currentBalance',
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
}