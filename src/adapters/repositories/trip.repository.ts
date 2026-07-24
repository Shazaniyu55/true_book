import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DeepPartial, EntityManager, FindManyOptions, Repository } from 'typeorm';
import { Trip } from '@modules/core/entities/trip.entity';
import { BookingStatus, CouponType, EscrowStatus, NotificationType, PaymentStatus, TicketStatus, TripStatus } from '../../types/enums';
import { NotificationService } from '@modules/notification/services/notification.service';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { Driver } from '@modules/core/entities/driver.entity';
import { BookTripDto, CancelBookingDto, CancelTripDto, CompleteTripDto, CreateTripDto, UpdateTripDto } from '@modules/trip/dtos/trip.dto';
import { ExpoService } from '@modules/notification/services/expo.service';
import { Escrow } from '@modules/core/entities/escro.entity';
import { TripsService } from '@modules/trip/service/trip.service';
import { Booking } from '@modules/core/entities/booking.entity';
import { PaymentFactory } from '@adapters/payment/payment.factory';
import { Passenger } from '@modules/core/entities/passenger.entity';
import { Coupon } from '@modules/core/entities/coupon.entity';
import { PagedDto } from '@shared/interface/paged.interface';
import { Vehicle } from '@modules/core/entities/vehicle.entity';
import { Payment } from '@modules/core/entities/payment.entity';
import { BookingIntent, BookingIntentStatus } from '@modules/core/entities/booking_intent.entity';
import { Review } from '@modules/core/entities/review.entity';
import { VehicleType } from '@modules/core/entities/vehicletype.entity';


/** Platform fee rate (deducted from driver payout) */
const PLATFORM_FEE_RATE = parseFloat(process.env.PLATFORM_FEE_RATE ?? '5'); // 5%

@Injectable()
export class TripRepository extends Repository<Trip> {
  private readonly logger = new Logger(TripsService.name);
  constructor(
    private readonly entityManager: EntityManager,
    private readonly randomnessUtil: RandomnessUtil,
    private readonly expoService: ExpoService,
    private readonly notificationService: NotificationService,
    private readonly paymentFactory: PaymentFactory,    
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Trip) private readonly tripRepository: Repository<Trip>,
    @InjectRepository(Escrow) private readonly escrowRepo: Repository<Escrow>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Passenger) private readonly passengerRepo: Repository<Passenger>,
    @InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(Vehicle) private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(BookingIntent) private readonly bookingIntentRepo: Repository<BookingIntent>,
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(VehicleType) private readonly vehicleTypeRepo: Repository<VehicleType>,
    
    
  ) {
    super(tripRepository.target, tripRepository.manager, tripRepository.queryRunner);
  }

      async createTrip(
        userId: string,
        dto: CreateTripDto,
        entityManager?: EntityManager,
      ): Promise<Trip> {

        const manager = entityManager || this.entityManager;

        const driver = await manager.findOne(Driver, {
          where: { userId },
        });

        if (!driver) {
          throw new NotFoundException('Driver profile not found');
        }

        if (!driver.licenseVerified) {
  throw new BadRequestException(
    "Please verify your driver's license before creating a trip",
  );
}

const vehicleCount = await manager.count(Vehicle, {
  where: { driverId: driver.id as any },
});
if (vehicleCount === 0) {
  throw new BadRequestException(
    'Please register a vehicle before creating a trip',
  );
}

        const reference = this.randomnessUtil.generateReference('TRP');

        const trip = manager.create(Trip, {
          ...dto,
          reference,
          driverId: driver.id, 
          status: TripStatus.PENDING,
          //bookedSeats: 0,
        });

        return await manager.save(Trip, trip);
      }


      async activateTrip(id: string, tripId: string): Promise<Trip>{

        const trip = await this.getTripOwnedByDriver(id, tripId);
            if (trip.status !== TripStatus.PENDING)
              throw new BadRequestException('Only pending trips can be activated');
        
            trip.status = TripStatus.ACTIVE;
            return this.tripRepository.save(trip);

      }

      async completeTrip(id: string, dto: CompleteTripDto, entityManager?: EntityManager,): Promise<Trip>{
       const manager = entityManager || this.entityManager;
      const trip = await this.getTripOwnedByDriver(id, dto.tripId);
          if (![TripStatus.ACTIVE, TripStatus.STARTED].includes(trip.status))
      throw new BadRequestException('Only active or started trips can be completed');


        trip.status = TripStatus.COMPLETED;
    if (dto.notes) trip.metadata = { ...(trip.metadata ?? {}), completionNotes: dto.notes };
    await manager.save(Trip, trip);

      // Release all held escrows for confirmed bookings on this trip
    await this.releaseEscrowsForTrip(trip.id, manager);

    // Grab confirmed bookings (with passengers) BEFORE flipping them,
    // so we know who to notify afterwards
    const confirmedBookings = await manager.find(Booking, {
      where: { tripId: trip.id, status: BookingStatus.CONFIRMED },
      relations: ['passenger'],
    });

         // Mark all confirmed bookings as completed
           await manager.update(
             Booking,
             { tripId: trip.id, status: BookingStatus.CONFIRMED },
             { status: BookingStatus.COMPLETED },
           );

    // Notify each passenger their trip is complete (best-effort,
    // mirrors Laravel's TripCompletedNotification)
    for (const booking of confirmedBookings) {
      if (!booking.passenger?.userId) continue;
      try {
        await this.notificationService.notify({
          userId: booking.passenger.userId,
          title: 'Trip Completed',
          body: `Your trip from ${trip.departureLocation} has been completed. Thanks for riding with us!`,
          type: NotificationType.TRIP_COMPLETED,
          data: { tripId: trip.id, bookingCode: booking.bookingCode },
        });
      } catch (err) {
        this.logger.warn(`Failed to notify passenger for booking ${booking.bookingCode}: ${err?.message}`);
      }
    }
       
       
       
           return trip;
           

      }

      async cancelTrip(id: string, dto: CancelTripDto, entityManager?: EntityManager): Promise<Trip> {
  const manager = entityManager || this.entityManager;

  const trip = await this.getTripOwnedByDriver(id, dto.tripId);
  if (![TripStatus.PENDING, TripStatus.ACTIVE, TripStatus.STARTED].includes(trip.status))
    throw new BadRequestException('Cannot cancel a completed or already-cancelled trip');

  trip.status = TripStatus.CANCELLED;
  trip.cancelledByDriver = true;                       // ← powers the activity() analytics
  trip.reasonForTripCancellation = dto.reason ?? null; // ← powers the activity() analytics
  trip.metadata = { ...(trip.metadata ?? {}), cancellationReason: dto.reason };
  await manager.save(Trip, trip);

  // Cancel + refund all confirmed/pending bookings
  const bookings = await manager.find(Booking, {
    where: { tripId: trip.id },
    relations: ['passenger', 'passenger.user'],
  });

  const failedRefunds: string[] = [];

  for (const booking of bookings) {
    if (![BookingStatus.CONFIRMED, BookingStatus.PENDING].includes(booking.status)) continue;

    // Refund directly via Paystack if this booking was paid
    if (
      booking.paymentStatus === PaymentStatus.SUCCESS &&
      booking.paymentReference
    ) {
      try {
        await this.paymentFactory.initiateRefund(
          booking.paymentReference,
          booking.amountPaid,
        );
        booking.paymentStatus = PaymentStatus.REFUNDED;
        booking.metadata = {
          ...(booking.metadata ?? {}),
          refundedAt: new Date().toISOString(),
          refundAmount: booking.amountPaid,
        };
      } catch (err) {
        // Don't abort the loop — other passengers still need their refunds.
        // Flag this booking so it can be retried later.
        this.logger.error(
          `Refund failed for booking ${booking.bookingCode} (trip ${trip.id})`,
          err,
        );
        booking.metadata = {
          ...(booking.metadata ?? {}),
          refundFailed: true,
          refundFailedAt: new Date().toISOString(),
        };
        failedRefunds.push(booking.bookingCode);
      }
    }

    booking.status = BookingStatus.CANCELLED;
    booking.metadata = { ...(booking.metadata ?? {}), cancelReason: dto.reason, cancelledBy: 'driver' };
    await manager.save(Booking, booking);

    // Notify each affected passenger (best-effort — a push failure
    // must never abort the cancellation/refund loop)
    if (booking.passenger?.userId) {
      try {
        await this.notificationService.notify({
          userId: booking.passenger.userId,
          title: 'Trip Cancelled',
          body: `Your trip from ${trip.departureLocation} was cancelled by the driver. ${
            booking.paymentStatus === PaymentStatus.REFUNDED
              ? 'Your refund has been initiated.'
              : ''
          }`.trim(),
          type: NotificationType.TRIP_CANCELLED,
          data: { tripId: trip.id, bookingCode: booking.bookingCode, reason: dto.reason },
        });
      } catch (err) {
        this.logger.warn(`Failed to notify passenger for booking ${booking.bookingCode}: ${err?.message}`);
      }
    }
  }

  if (failedRefunds.length) {
    this.logger.warn(
      `Trip ${trip.id} cancelled with ${failedRefunds.length} failed refund(s): ${failedRefunds.join(', ')}`,
    );
  }

  return trip;
}
    

  

    async findByReference(reference: string): Promise<Trip> {
      return this.findOne({ where: { reference }, relations: ['driver', 'vehicle'] });
    }

    async findActiveTrips(query: FindManyOptions<Trip> = {}): Promise<Trip[]> {
      return this.find({ ...query, where: { status: TripStatus.ACTIVE, ...query.where } });
    }

    async updateTrip(
      driverId: string,
      tripId: string,
      dto: UpdateTripDto,
      entityManager?: EntityManager,
    ): Promise<Trip> {
      const manager = entityManager || this.entityManager;

      // Get trip owned by driver
      const trip = await this.getTripOwnedByDriver(driverId, tripId);

      // Check confirmed bookings
      const bookingCount = await this.bookingRepo.count({
        where: {
          tripId,
          status: BookingStatus.CONFIRMED,
        },
      });

      if (bookingCount > 0) {
        throw new BadRequestException(
          'Cannot edit a trip that already has confirmed bookings',
        );
      }

      // Update trip fields
      Object.assign(trip, dto);

      // Save updated trip
      return await manager.save(Trip, trip);
    }

async scanTicket(
  driverUserId: string,
  payload: { bookingCode: string; ticketToken: string },
  entityManager?: EntityManager,
) {
  const manager = entityManager || this.entityManager;

  const driver = await this.driverRepo.findOne({ where: { userId: driverUserId } });
  if (!driver) throw new NotFoundException('Driver profile not found');

  const booking = await this.bookingRepo.findOne({
    where: { bookingCode: payload.bookingCode },
    relations: ['trip', 'passenger', 'passenger.user'],
  });
  if (!booking) throw new NotFoundException('Ticket not found');

  // ownership — ticket must belong to this driver's trip
  if (booking.trip?.driverId !== driver.id)
    throw new ForbiddenException('This ticket is not for your trip');

  // authenticity
  if (!booking.ticketToken || booking.ticketToken !== payload.ticketToken)
    throw new BadRequestException('Invalid ticket');

  // must be paid & confirmed
  if (booking.paymentStatus !== PaymentStatus.SUCCESS || booking.status !== BookingStatus.CONFIRMED)
    throw new BadRequestException('Ticket is not active');

  // idempotent — re-scanning never double-credits
  if (booking.ticketStatus === TicketStatus.SCANNED) {
    return { alreadyScanned: true, booking, credited: 0 };
  }

  booking.ticketStatus = TicketStatus.SCANNED;
  booking.scannedAt = new Date();
  booking.scannedBy = driver.id;
  booking.isCheckedIn = true;
  booking.checkedInAt = new Date();
  await manager.save(Booking, booking);

  const credited = await this.releaseEscrowForBooking(booking, manager);

  // Confirmation to the passenger (mirrors Laravel's BookTripConfirmationNotification)
  await this.notifyBookingVerified(booking);

  return { success: true, booking, credited };
}

/** Best-effort push to the passenger when their booking is verified/scanned. */
private async notifyBookingVerified(booking: Booking): Promise<void> {
  const passengerUserId = booking.passenger?.userId ?? booking.passenger?.user?.id;
  if (!passengerUserId) return;
  try {
    await this.notificationService.notify({
      userId: passengerUserId,
      title: 'Booking Verified',
      body: `Your booking ${booking.bookingCode} has been verified. Enjoy your trip!`,
      type: NotificationType.BOOKING_VERIFIED,
      data: { bookingId: booking.id, bookingCode: booking.bookingCode, tripId: booking.tripId },
    });
  } catch (err) {
    this.logger.warn(`Failed to send verification notification for ${booking.bookingCode}: ${err?.message}`);
  }
}

// ─── Driver: Verify a booking manually by code (PHP verifyBookings) ────────
// Fallback for when the QR can't be scanned (dead phone, broken screen).
// Same guarantees as scanTicket: ownership check, idempotent, credits escrow.

async verifyBookingByCode(
  driverUserId: string,
  bookingCode: string,
  entityManager?: EntityManager,
) {
  const manager = entityManager || this.entityManager;

  const driver = await this.driverRepo.findOne({ where: { userId: driverUserId } });
  if (!driver) throw new NotFoundException('Driver profile not found');

  const booking = await this.bookingRepo.findOne({
    where: { bookingCode },
    relations: ['trip', 'passenger', 'passenger.user'],
  });
  if (!booking) throw new NotFoundException('Invalid booking code');

  // ownership — booking must belong to this driver's trip
  if (booking.trip?.driverId !== driver.id)
    throw new ForbiddenException('This booking is not for your trip');

  // must be paid & confirmed
  if (booking.paymentStatus !== PaymentStatus.SUCCESS || booking.status !== BookingStatus.CONFIRMED)
    throw new BadRequestException('Booking is not active (unpaid or cancelled)');

  // idempotent — re-verifying never double-credits
  if (booking.ticketStatus === TicketStatus.SCANNED) {
    return { alreadyVerified: true, message: 'Already verified', booking, credited: 0 };
  }

  booking.ticketStatus = TicketStatus.SCANNED;
  booking.scannedAt = new Date();
  booking.scannedBy = driver.id;
  booking.isCheckedIn = true;
  booking.checkedInAt = new Date();
  await manager.save(Booking, booking);

  const credited = await this.releaseEscrowForBooking(booking, manager);

  await this.notifyBookingVerified(booking);

  return { success: true, message: 'Booking verified successfully', booking, credited };
}

// ─── Driver: Open/close bookings on a trip (PHP closeBookings) ─────────────
// Uses the existing `bookingStatus` varchar column already on the entity.

async setBookingStatus(
  driverUserId: string,
  tripId: string,
  open: boolean,
  entityManager?: EntityManager,
): Promise<Trip> {
  const manager = entityManager || this.entityManager;

  const trip = await this.getTripOwnedByDriver(driverUserId, tripId);

  if (![TripStatus.PENDING, TripStatus.ACTIVE].includes(trip.status))
    throw new BadRequestException('Bookings can only be toggled on upcoming or active trips');

  trip.bookingStatus = open ? 'open' : 'closed';
  return manager.save(Trip, trip);
}

// ─── Driver: Start trip (PHP actionsToPerformWhenTripIsStarted) ────────────
// Marks the trip as STARTED and notifies every confirmed passenger.

async startTrip(
  driverUserId: string,
  tripId: string,
  entityManager?: EntityManager,
): Promise<Trip> {
  const manager = entityManager || this.entityManager;

  const trip = await this.getTripOwnedByDriver(driverUserId, tripId);
  if (trip.status !== TripStatus.ACTIVE)
    throw new BadRequestException('Only active trips can be started');

  trip.status = TripStatus.STARTED;
  trip.metadata = { ...(trip.metadata ?? {}), startedAt: new Date().toISOString() };
  await manager.save(Trip, trip);

  // Notify all confirmed passengers (mirrors Laravel's TripStartedNotification)
  const bookings = await manager.find(Booking, {
    where: { tripId: trip.id, status: BookingStatus.CONFIRMED },
    relations: ['passenger'],
  });

  for (const booking of bookings) {
    if (!booking.passenger?.userId) continue;
    try {
      await this.notificationService.notify({
        userId: booking.passenger.userId,
        title: 'Trip Started',
        body: `Your trip from ${trip.departureLocation} has started.`,
        type: NotificationType.TRIP_STARTED,
        data: { tripId: trip.id, bookingCode: booking.bookingCode },
      });
    } catch (err) {
      this.logger.warn(`Failed to send trip-started notification for ${booking.bookingCode}: ${err?.message}`);
    }
  }

  return trip;
}

private async releaseEscrowForBooking(booking: Booking, manager: EntityManager): Promise<number> {
  const escrow = await this.escrowRepo.findOne({ where: { bookingId: booking.id } });
  if (!escrow || escrow.status !== EscrowStatus.HELD) return 0; // idempotent

  escrow.status = EscrowStatus.RELEASED;
  escrow.releasedAt = new Date();
  escrow.releaseReason = 'Ticket scanned at boarding';
  await manager.save(Escrow, escrow);

  await manager.increment(
    Driver,
    { id: escrow.driverId },
    'currentBalance',
    Number(escrow.netDriverAmount),
  );

  this.logger.log(`Escrow ${escrow.reference} released on scan → driver ${escrow.driverId} +${escrow.netDriverAmount}`);
  return Number(escrow.netDriverAmount);
}

async searchTripState(query: {
  page?: number;
  limit?: number;
  state?: string;
  status?: string;
}): Promise<PagedDto<any>> {
  const { page = 1, limit = 20, state, status } = query;

  const skip = (page - 1) * limit;

  const qb = this.tripRepository
    .createQueryBuilder('trip')
    .leftJoinAndSelect('trip.driver', 'driver')
    .leftJoinAndSelect('driver.user', 'user')
    .leftJoinAndSelect('trip.vehicle', 'vehicle');

  // Passengers should never see trips whose bookings the driver closed,
  // or whose booking window has already passed
  qb.andWhere("(trip.bookingStatus IS NULL OR trip.bookingStatus != 'closed')");
  qb.andWhere(
    `(trip.bookingClosingDate IS NULL OR trip.bookingClosingTime IS NULL
      OR (trip.bookingClosingDate + trip.bookingClosingTime) > NOW())`,
  );

  if (status) {
    qb.andWhere('trip.status = :status', { status });
  }

  if (state) {
    qb.andWhere('trip.state ILIKE :state', { state: `%${state}%` });
  }

  qb.orderBy('trip.departureDate', 'ASC').addOrderBy('trip.departureTime', 'ASC');

  const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

  const pagedDto = new PagedDto();
  pagedDto.data = data.map((t) => ({
    ...t,
    availableSeats: t.totalSeats - t.bookedSeats,
  }));

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


// async searchTrips(query: {
//   page?: number;
//   limit?: number;
//   origin?: string;
//   destination?: string;
//   date?: string;
//   seats?: number;
//   maxPrice?: number;
//   sortBy?: string;
//   status?: string;
//   state?: string;
//   location?: string;
// }): Promise<PagedDto<any>> {
//   const {
//     page = 1, limit = 20,
//     origin, destination, date, seats, maxPrice, sortBy, status,
//     state, location,
//   } = query;

//   const skip = (page - 1) * limit;

//   const qb = this.tripRepository
//     .createQueryBuilder('trip')
//     .leftJoinAndSelect('trip.driver', 'driver')
//     .leftJoinAndSelect('driver.user', 'user')
//     .leftJoinAndSelect('trip.vehicle', 'vehicle');

//   // Passengers should never see trips whose bookings the driver closed,
//   // or whose booking window has already passed
//   qb.andWhere("(trip.bookingStatus IS NULL OR trip.bookingStatus != 'closed')");
//   qb.andWhere(
//     `(trip.bookingClosingDate IS NULL OR trip.bookingClosingTime IS NULL
//       OR (trip.bookingClosingDate + trip.bookingClosingTime) > NOW())`,
//   );

//   // Only filter by status if explicitly provided
//   if (status) {
//     qb.andWhere('trip.status = :status', { status });
//   }

//   if (origin) {
//     qb.andWhere('trip.departureLocation ILIKE :origin', { origin: `%${origin}%` });
//   }

//   if (destination) {
//     qb.andWhere('CAST(trip.arrivalDestination AS TEXT) ILIKE :destination', {
//       destination: `%${destination}%`,
//     });
//   }

//   // if (state) {
//   //   qb.andWhere('trip.state ILIKE :state', { state: `%${state}%` });
//   // }

//   if (location) {
//     qb.andWhere('trip.departureLocation ILIKE :location', { location: `%${location}%` });
//   }

//   if (date) {
//     qb.andWhere('trip.departureDate = :date', { date });
//   }

//   if (seats) {
//     qb.andWhere('(trip.totalSeats - trip.bookedSeats) >= :seats', { seats });
//   }

//   if (maxPrice) {
//     qb.andWhere('trip.price::numeric <= :maxPrice', { maxPrice });
//   }

//   switch (sortBy) {
//     case 'price':
//       qb.addSelect('trip.price::numeric', 'price_numeric')
//         .orderBy('price_numeric', 'ASC');
//       break;
//     case 'seats':
//       qb.addSelect('(trip.totalSeats - trip.bookedSeats)', 'available_seats')
//         .orderBy('available_seats', 'DESC');
//       break;
//     default:
//       qb.orderBy('trip.departureDate', 'ASC').addOrderBy('trip.departureTime', 'ASC');
//   }

//   const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

//   const pagedDto = new PagedDto();
//   pagedDto.data = data.map((t) => ({
//     ...t,
//     availableSeats: t.totalSeats - t.bookedSeats,
//   }));

//   pagedDto.meta = {
//     page,
//     limit,
//     count: data.length,
//     previousPage: page > 1 ? page - 1 : false,
//     nextPage: skip + limit < total ? page + 1 : false,
//     pageCount: Math.ceil(total / limit),
//     totalRecords: total,
//   };

//   return pagedDto;
// }

async searchTrips(query: {
  page?: number;
  limit?: number;
  origin?: string;
  destination?: string;
  date?: string;
  seats?: number;
  maxPrice?: number;
  sortBy?: string;
  status?: string;
  state?: string;
  location?: string;
  /** Pass true to include trips whose booking window has already closed. */
  includePast?: boolean | string;
}): Promise<PagedDto<any>> {
  const {
    origin,
    destination,
    date,
    seats,
    maxPrice,
    sortBy,
    status,
    location,
  } = query;
 
  // Query-string values arrive as strings — coerce and clamp.
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
 
  const includePast = query.includePast === true || query.includePast === 'true';
 
  const qb = this.tripRepository
    .createQueryBuilder('trip')
    .leftJoinAndSelect('trip.driver', 'driver')
    .leftJoinAndSelect('driver.user', 'user')
    .leftJoinAndSelect('trip.vehicle', 'vehicle');
 
  // Never show trips the driver explicitly closed.
  qb.andWhere("(trip.bookingStatus IS NULL OR trip.bookingStatus != 'closed')");
 
  // Booking window. Skipped when the caller asks for a specific date or opts
  // into past trips — otherwise searching a past date can never return a row.
  if (!includePast && !date) {
    qb.andWhere(
      `(trip.bookingClosingDate IS NULL OR trip.bookingClosingTime IS NULL
        OR (trip.bookingClosingDate + trip.bookingClosingTime) > NOW())`,
    );
  }
 
  if (status) {
    qb.andWhere('trip.status = :status', { status });
  }
 
  // ── Location matching ────────────────────────────────────────────────
  // Each comma-separated token must appear somewhere in the stored value.
  // Tolerates "Benin City, Edo, Nigeria" vs "Benin city,Edo,Nigeria" and
  // works on the text form of a jsonb column regardless of key order.
 
  if (origin) {
    this.tokenizeLocation(origin).forEach((token, i) => {
      qb.andWhere(`trip.departureLocation ILIKE :originTok${i}`, {
        [`originTok${i}`]: `%${token}%`,
      });
    });
  }
 
  if (destination) {
    this.tokenizeLocation(destination).forEach((token, i) => {
      qb.andWhere(`CAST(trip.arrivalDestination AS TEXT) ILIKE :destTok${i}`, {
        [`destTok${i}`]: `%${token}%`,
      });
    });
  }
 
  if (location) {
    this.tokenizeLocation(location).forEach((token, i) => {
      qb.andWhere(`trip.departureLocation ILIKE :locTok${i}`, {
        [`locTok${i}`]: `%${token}%`,
      });
    });
  }
 
  // ── Date ─────────────────────────────────────────────────────────────
  if (date) {
    const iso = this.normalizeDate(date);
    if (!iso) {
      throw new BadRequestException(
        'Invalid date format. Use DD-MM-YYYY or YYYY-MM-DD.',
      );
    }
    // ::date guards against departureDate being stored as a timestamp.
    //qb.andWhere('trip.departureDate::date = :date', { date: iso });
    qb.andWhere('CAST(trip.departureDate AS DATE) = :departureDateParam', {
      departureDateParam: iso,
    });
  }
 
  if (seats) {
    qb.andWhere('(trip.totalSeats - COALESCE(trip.bookedSeats, 0)) >= :seats', {
      seats: Number(seats),
    });
  }
 
  // if (maxPrice) {
  //   qb.andWhere('trip.price::numeric <= :maxPrice', { maxPrice: Number(maxPrice) });
  // }

  if (maxPrice) {
    qb.andWhere('CAST(trip.price AS NUMERIC) <= :maxPriceParam', {
      maxPriceParam: Number(maxPrice),
    });
  }
 
  // ── Sorting ──────────────────────────────────────────────────────────
  // Order by the expression itself, not a SELECT alias: skip/take makes
  // TypeORM wrap the query in a DISTINCT subquery where addSelect aliases
  // aren't visible to the outer ORDER BY.
  switch (sortBy) {
    case 'price':
      qb.orderBy('CAST(trip.price AS NUMERIC)', 'ASC');
      break;
    case 'seats':
      qb.orderBy('(trip.totalSeats - COALESCE(trip.bookedSeats, 0))', 'DESC');
      break;
    default:
      qb.orderBy('trip.departureDate', 'ASC')
        .addOrderBy('trip.departureTime', 'ASC');
  }
  qb.addOrderBy('trip.id', 'ASC'); // stable tiebreak so pages don't shuffle
 
  const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();
 
  const pagedDto = new PagedDto();
  pagedDto.data = data.map((t) => ({
    ...t,
    availableSeats: t.totalSeats - (t.bookedSeats ?? 0),
  }));
 
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


  async getTripById(tripId: string) {
  const trip = await this.tripRepository.findOne({
    where: { id: tripId },
    relations: ['driver', 'driver.user', 'vehicle'],
  });
  if (!trip) throw new NotFoundException('Trip not found');

  const bookings = await this.bookingRepo.find({
    where: { tripId: trip.id },
    relations: ['passenger', 'passenger.user'],
    order: { createdAt: 'DESC' },
  });

  return {
    ...trip,
    availableSeats: trip.totalSeats - (trip.bookedSeats ?? 0),
    bookings,
  };
}


async getTripSummaryById(tripId: string, driverUserId?: string) {
  const trip = await this.tripRepository.findOne({
    where: { id: tripId },
    relations: ['vehicle', 'driver', 'driver.user'],
  });
  if (!trip) throw new NotFoundException('Trip not found');

  // ownership check — only runs when a driver is calling
  if (driverUserId) {
    const driver = await this.driverRepo.findOne({ where: { userId: driverUserId } });
    if (!driver) throw new NotFoundException('Driver profile not found');
    if (trip.driverId !== driver.id)
      throw new ForbiddenException('This trip does not belong to you');
  }

  const spec = this.parseTripSpecification(trip.tripSpecification);

  const dest = Array.isArray(trip.arrivalDestination)
    ? trip.arrivalDestination[0] ?? {}
    : (trip.arrivalDestination as any) ?? {};

  // ── bookings ──
  const bookings = await this.bookingRepo.find({
    where: { tripId: trip.id },
    relations: ['passenger', 'passenger.user'],
    order: { createdAt: 'DESC' },
  });
  const activeBookings = bookings.filter((b) => b.status !== BookingStatus.CANCELLED);

  const extraLuggage = activeBookings.reduce(
    (sum, b) => sum + Number(b.metadata?.extraLuggageCharge ?? 0), 0,
  );
  const totalAmount = activeBookings.reduce(
    (sum, b) => sum + Number(b.amountPaid ?? 0), 0,
  );

  const passengers = activeBookings
    .map((b) =>
      [b.passenger?.user?.firstName, b.passenger?.user?.lastName]
        .filter(Boolean).join(' ').trim(),
    )
    .filter((name) => name.length > 0);

  // ── reviews on this trip ──
  const reviews = await this.reviewRepo.find({
    where: { tripId: trip.id, isVisible: true },
    relations: ['passenger', 'passenger.user'],
    order: { createdAt: 'DESC' },
  });

  const usersReview = reviews.map((r) => ({
    'passenger_name ': [r.passenger?.user?.firstName, r.passenger?.user?.lastName]
      .filter(Boolean).join(' ').trim(),
    passenger_email: r.passenger?.user?.email ?? '',
    profile_image: r.passenger?.user?.profileImage ?? '',
    rating: Number(r.rating ?? 0),
    comment: r.comment ?? '',
    created_at: r.createdAt ? new Date(r.createdAt).toISOString() : '',
  }));

  // ── vehicle ──
  const v = trip.vehicle;

  let vehicleTypes: any[] = [];
  if (v?.type) {
    vehicleTypes = await this.vehicleTypeRepo
      .createQueryBuilder('vt')
      .where('vt.name ILIKE :name', { name: v.type })
      .getMany();
  }

  const regDocs = [
    ...(v?.registrationDoc ? [v.registrationDoc] : []),
    ...(Array.isArray(v?.documents) ? (v.documents as any[]) : []),
  ];

  const vehicle = v
    ? {
        id: v.id,
        type: v.type ?? '',
        model: v.model ?? '',
        color: v.color ?? '',
        capacity: String(v.capacity ?? ''),
        description: trip.description ?? '',
        insurance: v.insurance ?? '',
        license_plate_number: v.licensePlateNumber ?? v.plateNumber ?? '',
        features: v.features ?? trip.vehicleFeatures ?? [],
        photos: v.vehiclePhoto ?? [],
        reg_docs: regDocs,
        vehicle_type: vehicleTypes,
        driver: trip.driver
          ? [{
              id: trip.driver.id,
              name: [trip.driver.user?.firstName, trip.driver.user?.lastName]
                .filter(Boolean).join(' ').trim(),
              email: trip.driver.user?.email ?? '',
              phone: trip.driver.user?.phone ?? '',
              profile_image: trip.driver.user?.profileImage ?? '',
              average_rating: Number(trip.driver.averageRating ?? 0),
              rating_count: Number(trip.driver.ratingCount ?? 0),
            }]
          : [],
      }
    : null;

  return {
    id: trip.id,
    destination: {
      pick_station: trip.pickStation ?? trip.departureLocation ?? '',
      drop_off_station: trip.dropOffStation ?? '',
    },
    departure: {
      date: trip.departureDate ?? '',
      time: trip.departureTime ?? '',
    },
    arrival: {
      date: trip.arrivalDate ?? '',
      time: trip.arrivalTime ?? '',
      destination: dest?.name ?? '',
      address: dest?.address ?? '',
      latitude: String(dest?.latitude ?? ''),
      long: String(dest?.longitude ?? ''),
      bus_stop: (trip.busStop ?? []).map((s: any) =>
        typeof s === 'string' ? { name: s } : { name: s?.name ?? '' },
      ),
    },
    luggage_size: spec.luggage_size ?? null,
    charge_for_extra_luggage: spec.charge_for_extra_luggage ?? null,
    earnings: {
      extra_luggage: extraLuggage,
      total_amount: totalAmount,
    },
    passengers,
    users_review: usersReview,
    vehicle,
  };
}
//case 1
//   async bookTrip(userId: string, dto: BookTripDto, entityManager: EntityManager) {
//   const manager = entityManager || this.entityManager;

//   const trip = await this.tripRepository.findOne({
//     where: { id: dto.tripId },
//     relations: ['driver', 'driver.user', 'vehicle'],
//   });
//   if (!trip) throw new NotFoundException('Trip not found');
//   // if (trip.status !== TripStatus.ACTIVE)
//   //   throw new BadRequestException('This trip is not accepting bookings');

//   // ── driver manually closed bookings (mirrors Laravel closeBookings) ──
//   if (trip.bookingStatus === 'closed')
//     throw new BadRequestException('Bookings for this trip have been closed by the driver');

//   // ── time guards (mirrors Laravel) ──
//   const departure = new Date(`${trip.departureDate}T${trip.departureTime}`);
//   if (!isNaN(departure.getTime()) && departure.getTime() <= Date.now())
//     throw new BadRequestException("You can't book this trip — departure time has elapsed");

//   if (trip.bookingClosingDate && trip.bookingClosingTime) {
//     const closing = new Date(`${trip.bookingClosingDate}T${trip.bookingClosingTime}`);
//     if (!isNaN(closing.getTime()) && closing.getTime() <= Date.now())
//       throw new BadRequestException("You can't book this trip — booking time is over");
//   }

//   // ── seats (now respects bookedSeats) ──
//   const available = trip.totalSeats - (trip.bookedSeats ?? 0);
//   if (dto.seats > available)
//     throw new BadRequestException(`Only ${available} seat(s) available`);

//   const passenger = await this.passengerRepo.findOne({
//     where: { userId },
//     relations: ['user'],
//   });
//   if (!passenger) throw new NotFoundException('Passenger profile not found');

//   // ── duplicate pending booking (keys fixed) ──
//   const existing = await this.bookingRepo.findOne({
//     where: { tripId: trip.id, passengerId: passenger.id, status: BookingStatus.PENDING },
//   });
//   if (existing) throw new BadRequestException('You already have a pending booking for this trip');

//   // ── pricing: base × seats + extra luggage ──
//   const spec = this.parseTripSpecification(trip.tripSpecification);
//   const basePrice = Number(spec.price ?? trip.price ?? 0);
//   let totalAmount = basePrice * dto.seats;

//   const luggageSize = Number(spec.luggage_size ?? 0);
//   const luggageCharge = Number(spec.charge_for_extra_luggage ?? 0);
//   const totalWeight = (dto.extraLuggage ?? []).reduce((s, l) => s + Number(l.weight ?? 0), 0);
//   let extraLuggageCharge = 0;
//   if (luggageSize > 0 && totalWeight > 0) {
//     extraLuggageCharge = Math.ceil(totalWeight / luggageSize) * luggageCharge;
//     totalAmount += extraLuggageCharge;
//   }

//   // ── coupon (rejects invalid, like Laravel) ──
//   const { discountAmount, couponId } = await this.applyCoupon(dto.couponCode, totalAmount);

//   const amountPaid = Math.max(0, totalAmount - discountAmount);
//   const bookingCode = this.randomnessUtil.generateBookingCode(8);
//   const paymentReference = this.randomnessUtil.generateReference('BKG');

//   const booking = manager.create(Booking, {
//     bookingCode,
//     tripId: trip.id,
//     passengerId: passenger.id,
//     seats: dto.seats,
//     totalAmount,            // NGN — do NOT multiply by 100
//     discountAmount,
//     amountPaid,
//     status: BookingStatus.PENDING,
//     paymentStatus: PaymentStatus.PENDING,
//     paymentReference,
//     couponCode: dto.couponCode,
//     metadata: { extraLuggageCharge, totalBeforeDiscount: totalAmount },
//   });
//   const savedBooking = await manager.save(Booking, booking);

//   await manager.increment(Trip, { id: trip.id }, 'bookedSeats', dto.seats);
//   if (couponId) await manager.increment(Coupon, { id: couponId }, 'usageCount', 1);

//   const paymentRecord = manager.create(Payment, {
//   bookingId: savedBooking.id,
//   passengerId: passenger.id,
//   tripId: trip.id,
//   txRef: paymentReference,        // ← same reference used for Paystack
//   status: PaymentStatus.PENDING,
//   amount: amountPaid,
//   customerEmail: passenger.user.email,
//   customerName: `${passenger.user.firstName} ${passenger.user.lastName}`,
// });
// await manager.save(Payment, paymentRecord);

//   const payment = await this.paymentFactory.initiatePayment({
//     amount: amountPaid,
//     email: passenger.user.email,
//     reference: paymentReference,
//     callback_url: dto.callbackUrl,
//     metadata: {
//       bookingCode,
//       bookingId: savedBooking.id,
//       tripId: trip.id,
//       passengerId: passenger.id,
//       driverId: trip.driverId,
//       seats: dto.seats,
//       type: 'trip_booking',
//     },
//   });

//   return {
//     booking: savedBooking,
//     payment,
//     summary: {
//       departureTime: trip.departureTime,
//       seats: dto.seats,
//       pricePerSeat: basePrice,
//       extraLuggageCharge,
//       totalAmount,
//       discountAmount,
//       amountPaid,
//     },
//   };
// }

//case 2
// async bookTrip(userId: string, dto: BookTripDto, entityManager: EntityManager) {
//   const manager = entityManager || this.entityManager;

//   const trip = await this.tripRepository.findOne({
//     where: { id: dto.tripId },
//     relations: ['driver', 'driver.user', 'vehicle'],
//   });
//   if (!trip) throw new NotFoundException('Trip not found');

//   // ── driver manually closed bookings ──
//   if (trip.bookingStatus === 'closed')
//     throw new BadRequestException('Bookings for this trip have been closed by the driver');

//   // ── time guards ──
//   const departure = new Date(`${trip.departureDate}T${trip.departureTime}`);
//   if (!isNaN(departure.getTime()) && departure.getTime() <= Date.now())
//     throw new BadRequestException("You can't book this trip — departure time has elapsed");

//   if (trip.bookingClosingDate && trip.bookingClosingTime) {
//     const closing = new Date(`${trip.bookingClosingDate}T${trip.bookingClosingTime}`);
//     if (!isNaN(closing.getTime()) && closing.getTime() <= Date.now())
//       throw new BadRequestException("You can't book this trip — booking time is over");
//   }

//   // ── seats ──
//   const available = trip.totalSeats - (trip.bookedSeats ?? 0);
//   if (dto.seats > available)
//     throw new BadRequestException(`Only ${available} seat(s) available`);

//   const passenger = await this.passengerRepo.findOne({
//     where: { userId },
//     relations: ['user'],
//   });
//   if (!passenger) throw new NotFoundException('Passenger profile not found');

  
//   const existing = await this.bookingIntentRepo.findOne({
//     where: { tripId: trip.id, passengerId: passenger.id, status: BookingIntentStatus.PENDING },
//     relations: ['passenger', 'passenger.user'],
//   });
//   if (existing && (!existing.expiresAt || existing.expiresAt > new Date())) {
//     //await this.bookingIntentRepo.delete();
//     const payment = await this.paymentFactory.initiatePayment({
//       amount: Number(existing.amountPaid),
//       email: passenger.user.email,
//       reference: existing.paymentReference,
//       callback_url: dto.callbackUrl,
//       metadata: {
//         bookingCode: existing.bookingCode,
//         intentId: existing.id,
//         tripId: trip.id,
//         passengerId: passenger.id,
//         driverId: trip.driverId,
//         seats: existing.seats,
//         type: 'trip_booking',
//       },
//     });
//     return { intent: existing, payment, resumed: true };
//   }

//   // ── pricing: base × seats + extra luggage ──
//   const spec = this.parseTripSpecification(trip.tripSpecification);
//   const basePrice = Number(spec.price ?? trip.price ?? 0);
//   let totalAmount = basePrice * dto.seats;

//   const luggageSize = Number(spec.luggage_size ?? 0);
//   const luggageCharge = Number(spec.charge_for_extra_luggage ?? 0);
//   const totalWeight = (dto.extraLuggage ?? []).reduce((s, l) => s + Number(l.weight ?? 0), 0);
//   let extraLuggageCharge = 0;
//   if (luggageSize > 0 && totalWeight > 0) {
//     extraLuggageCharge = Math.ceil(totalWeight / luggageSize) * luggageCharge;
//     totalAmount += extraLuggageCharge;
//   }

//   // ── coupon ──
//   const { discountAmount, couponId } = await this.applyCoupon(dto.couponCode, totalAmount);

//   const amountPaid = Math.max(0, totalAmount - discountAmount);
//   const bookingCode = this.randomnessUtil.generateBookingCode(8);
//   const paymentReference = this.randomnessUtil.generateReference('BKG');

//   // ── store a BookingIntent (NOT a booking) ──
//   const intent = await manager.save(
//     BookingIntent,
//     manager.create(BookingIntent, {
//       bookingCode,
//       tripId: trip.id,
//       passengerId: passenger.id,
//       seats: dto.seats,
//       totalAmount,
//       discountAmount,
//       amountPaid,
//       couponCode: dto.couponCode,
//       couponId,
//       paymentReference,
//       status: BookingIntentStatus.PENDING,
//       expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30-min window
//       metadata: { extraLuggageCharge, totalBeforeDiscount: totalAmount },
//     }),
//   );

//   // hold the seat during the payment window (released on expiry sweep)
//   await manager.increment(Trip, { id: trip.id }, 'bookedSeats', dto.seats);

//   await manager.save(
//     Payment,
//     manager.create(Payment, {
//       bookingIntentId: intent.id, // no bookingId yet — set on payment success
//       passengerId: passenger.id,
//       tripId: trip.id,
//       txRef: paymentReference,
//       status: PaymentStatus.PENDING,
//       amount: amountPaid,
//       customerEmail: passenger.user.email,
//       customerName: `${passenger.user.firstName} ${passenger.user.lastName}`,
//     }),
//   );

//   const payment = await this.paymentFactory.initiatePayment({
//     amount: amountPaid,
//     email: passenger.user.email,
//     reference: paymentReference,
//     callback_url: dto.callbackUrl,
//     metadata: {
//       bookingCode,
//       intentId: intent.id, // ← was bookingId: savedBooking.id
//       tripId: trip.id,
//       passengerId: passenger.id,
//       driverId: trip.driverId,
//       seats: dto.seats,
//       type: 'trip_booking',
//     },
//   });

//   return {
//     intent, // ← was booking: savedBooking
//     payment,
//     summary: {
//       departureTime: trip.departureTime,
//       seats: dto.seats,
//       pricePerSeat: basePrice,
//       extraLuggageCharge,
//       totalAmount,
//       discountAmount,
//       amountPaid,
//     },
//   };
// }

//case 3
async bookTrip(userId: string, dto: BookTripDto, entityManager: EntityManager) {
  const manager = entityManager || this.entityManager;

  const trip = await this.tripRepository.findOne({
    where: { id: dto.tripId },
    relations: ['driver', 'driver.user', 'vehicle'],
  });
  if (!trip) throw new NotFoundException('Trip not found');

  // ── driver manually closed bookings ──
  if (trip.bookingStatus === 'closed')
    throw new BadRequestException('Bookings for this trip have been closed by the driver');

  // ── time guards ──
  const departure = new Date(`${trip.departureDate}T${trip.departureTime}`);
  if (!isNaN(departure.getTime()) && departure.getTime() <= Date.now())
    throw new BadRequestException("You can't book this trip — departure time has elapsed");

  if (trip.bookingClosingDate && trip.bookingClosingTime) {
    const closing = new Date(`${trip.bookingClosingDate}T${trip.bookingClosingTime}`);
    if (!isNaN(closing.getTime()) && closing.getTime() <= Date.now())
      throw new BadRequestException("You can't book this trip — booking time is over");
  }

  const passenger = await this.passengerRepo.findOne({
    where: { userId },
    relations: ['user'],
  });
  if (!passenger) throw new NotFoundException('Passenger profile not found');

  // ── existing pending intent → delete it and start fresh ──
  const existing = await this.bookingIntentRepo.findOne({
    where: { tripId: trip.id, passengerId: passenger.id, status: BookingIntentStatus.PENDING },
  });
  if (existing) {
    // remove the stale pending payment tied to it (avoids orphan rows)
    await manager.delete(Payment, { bookingIntentId: existing.id });
    // release the seat the old intent was holding
    await manager.decrement(Trip, { id: trip.id }, 'bookedSeats', existing.seats);
    // delete the old intent itself
    await manager.delete(BookingIntent, { id: existing.id });
  }

  // ── seats (re-read AFTER releasing any old hold above) ──
  const freshTrip = await this.tripRepository.findOne({ where: { id: trip.id } });
  const available = freshTrip.totalSeats - (freshTrip.bookedSeats ?? 0);
  if (dto.seats > available)
    throw new BadRequestException(`Only ${available} seat(s) available`);

  // ── pricing: base × seats + extra luggage ──
  const spec = this.parseTripSpecification(trip.tripSpecification);
  const basePrice = Number(spec.price ?? trip.price ?? 0);
  let totalAmount = basePrice * dto.seats;

  const luggageSize = Number(spec.luggage_size ?? 0);
  const luggageCharge = Number(spec.charge_for_extra_luggage ?? 0);
  const totalWeight = (dto.extraLuggage ?? []).reduce((s, l) => s + Number(l.weight ?? 0), 0);
  let extraLuggageCharge = 0;
  if (luggageSize > 0 && totalWeight > 0) {
    extraLuggageCharge = Math.ceil(totalWeight / luggageSize) * luggageCharge;
    totalAmount += extraLuggageCharge;
  }

  // ── coupon ──
  const { discountAmount, couponId } = await this.applyCoupon(dto.couponCode, totalAmount);

  const amountPaid = Math.max(0, totalAmount - discountAmount);
  const bookingCode = this.randomnessUtil.generateBookingCode(8);
  const paymentReference = this.randomnessUtil.generateReference('BKG');

  // ── store a fresh BookingIntent (NOT a booking) ──
  const intent = await manager.save(
    BookingIntent,
    manager.create(BookingIntent, {
      bookingCode,
      tripId: trip.id,
      passengerId: passenger.id,
      seats: dto.seats,
      totalAmount,
      discountAmount,
      amountPaid,
      couponCode: dto.couponCode,
      couponId,
      paymentReference,
      status: BookingIntentStatus.PENDING,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30-min window
      metadata: { extraLuggageCharge, totalBeforeDiscount: totalAmount },
    }),
  );

  // hold the seat during the payment window
  await manager.increment(Trip, { id: trip.id }, 'bookedSeats', dto.seats);

  await manager.save(
    Payment,
    manager.create(Payment, {
      bookingIntentId: intent.id, // no bookingId yet — set on payment success
      passengerId: passenger.id,
      tripId: trip.id,
      txRef: paymentReference,
      status: PaymentStatus.PENDING,
      amount: amountPaid,
      customerEmail: passenger.user.email,
      customerName: `${passenger.user.firstName} ${passenger.user.lastName}`,
    }),
  );

  const payment = await this.paymentFactory.initiatePayment({
    amount: amountPaid,
    email: passenger.user.email,
    reference: paymentReference,
    callback_url: dto.callbackUrl,
    metadata: {
      bookingCode,
      intentId: intent.id,
      tripId: trip.id,
      passengerId: passenger.id,
      driverId: trip.driverId,
      seats: dto.seats,
      type: 'trip_booking',
    },
  });

  return {
    intent,
    payment,
    summary: {
      departureTime: trip.departureTime,
      seats: dto.seats,
      pricePerSeat: basePrice,
      extraLuggageCharge,
      totalAmount,
      discountAmount,
      amountPaid,
    },
  };
}

//   async confirmBookingPayment(  bookingId: string,
//     paymentReference: string,
//     entityManager: EntityManager,){

//     const manager = entityManager || this.entityManager;

//         const booking = await this.bookingRepo.findOne({
//       where: { id: bookingId },
//       relations: ['trip', 'passenger', 'passenger.user'],
//     });

//         if (!booking) throw new NotFoundException('Booking not found');
//     if (booking.status === BookingStatus.CONFIRMED) return booking; // idempotent

//     booking.status = BookingStatus.CONFIRMED;
//     booking.paymentStatus = PaymentStatus.SUCCESS;
//     booking.paymentReference = paymentReference;

//     // ── issue boarding ticket ──
//     booking.ticketToken = this.randomnessUtil.generateSecureToken(40);
//     booking.ticketStatus = TicketStatus.ISSUED;
//     booking.ticketIssuedAt = new Date();

//     await manager.save(Booking, booking);

//         // Create escrow record
//     const platformFee = (booking.amountPaid * PLATFORM_FEE_RATE) / 100;
//     const netDriverAmount = booking.amountPaid - platformFee;
//     const escrowRef = this.randomnessUtil.generateReference('ESC');

//    const escrow = manager.create(Escrow, {
//   reference: escrowRef,
//   bookingId: booking.id,
//   amount: booking.amountPaid,
//   platformFee,
//   netDriverAmount,
//   status: EscrowStatus.HELD,
//   driverId: booking.trip.driverId,
//   passengerId: booking.passengerId,
//   paymentReference,
// } as DeepPartial<Escrow>);

// await manager.save(escrow);

// return booking;

//   }

  

async cancelBooking(id: string, dto: CancelBookingDto, entityManager?: EntityManager) {
  const manager = entityManager || this.entityManager;

  // `id` is the userId from the auth token
  const passenger = await manager.findOne(Passenger, { where: { userId: id } });
  if (!passenger) throw new NotFoundException('Passenger profile not found');

  const booking = await manager.findOne(Booking, {
    where: { id: dto.bookingId, passengerId: passenger.id },
    relations: ['trip'],
  });
  if (!booking) throw new NotFoundException('Booking not found');

  if (![BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(booking.status))
    throw new BadRequestException('This booking cannot be cancelled');

  // Cancellation window: at least 2 hours before departure
  const hoursBeforeDeparture =
    (new Date(booking.trip.departureTime).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursBeforeDeparture < 2)
    throw new BadRequestException(
      'Cancellations must be made at least 2 hours before departure',
    );

  // ── Refund via Paystack if the booking was paid ──
  // Done BEFORE marking cancelled: if the refund fails, the booking
  // stays untouched and the passenger can simply retry.
  if (
    booking.paymentStatus === PaymentStatus.SUCCESS &&
    booking.paymentReference
  ) {
    try {
      await this.paymentFactory.initiateRefund(
        booking.paymentReference,
        booking.amountPaid,
      );
    } catch (err) {
      this.logger.error(`Refund failed for booking ${booking.bookingCode}`, err);
      throw new BadRequestException(
        'Refund could not be processed. Please try again or contact support.',
      );
    }
    booking.paymentStatus = PaymentStatus.REFUNDED;
  }

  booking.status = BookingStatus.CANCELLED;
  booking.metadata = {
    ...(booking.metadata ?? {}),
    cancelReason: dto.reason,
    ...(booking.paymentStatus === PaymentStatus.REFUNDED && {
      refundedAt: new Date().toISOString(),
      refundAmount: booking.amountPaid,
    }),
  };
  await manager.save(Booking, booking);

  // Release locked seats
  await manager.decrement(Trip, { id: booking.tripId }, 'bookedSeats', booking.seats);

  return { message: 'Booking cancelled and refund initiated', booking };
}


  async getMyBookings(userId: string, query: { page?: number; limit?: number; status?: string }) {
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


  
  async getMyTrips(userId: string, query: { page?: number; limit?: number; status?: string }) {
    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const where: any = { driverId: driver.id };
    if (status) where.status = status;

    const [data, total] = await this.tripRepository.findAndCount({
      where,
      skip,
      take: limit,
      relations: ['vehicle', 'driver', 'driver.user'],
      order: { departureTime: 'DESC' },
    });

      const pagedDto = new PagedDto();
      pagedDto.data = data.map((t) => ({...t,availableSeats: t.totalSeats,}));

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


  async getTripBookings(id: string, tripId: string, search?: string) {
    await this.getTripOwnedByDriver(id, tripId);

    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.passenger', 'p')
      .leftJoinAndSelect('p.user', 'u')
      .where('b.tripId = :tripId', { tripId })
      .orderBy('b.createdAt', 'DESC');

    // ── PHP passengerInfo search: name / email / phone / booking code / status ──
    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      qb.andWhere(
        new Brackets((w) => {
          w.where('u.firstName ILIKE :term', { term })
            .orWhere('u.lastName ILIKE :term', { term })
            .orWhere('u.email ILIKE :term', { term })
            .orWhere('u.phone ILIKE :term', { term })
            .orWhere('b.bookingCode ILIKE :term', { term })
            .orWhere('CAST(b.status AS TEXT) ILIKE :term', { term });
        }),
      );
    }

    return qb.getMany();
  }

  async checkInPassenger(userId: string, bookingId: string){
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

   async getBookingByCode( id: string, bookingCode: string,) {
      const passenger = await this.passengerRepo.findOne({ where: { id } });
      const booking = await this.bookingRepo.findOne({
        where: { bookingCode },
        relations: ['trip', 'trip.driver', 'trip.driver.user', 'trip.vehicle'],
      });
      if (!booking) throw new NotFoundException('Booking not found');
      if (passenger && booking.passengerId !== passenger.id)
        throw new ForbiddenException('This booking does not belong to you');
      return booking;
    }


  /**
 * Returns trip counts grouped by status.
 * Pass a driverId to scope it to one driver; omit for a platform-wide tally.
 */
async getTripStatusCounts(driverId?: string): Promise<{
  pending: number;
  active: number;
  completed: number;
  cancelled: number;
  total: number;
}> {
  const base = driverId ? { driverId } : {};

  const [pending, active, completed, cancelled] = await Promise.all([
    this.tripRepository.count({ where: { ...base, status: TripStatus.PENDING } }),
    this.tripRepository.count({ where: { ...base, status: TripStatus.ACTIVE } }),
    this.tripRepository.count({ where: { ...base, status: TripStatus.COMPLETED } }),
    this.tripRepository.count({ where: { ...base, status: TripStatus.CANCELLED } }),
  ]);

  return {
    pending,
    active,
    completed,
    cancelled,
    total: pending + active + completed + cancelled,
  };
}

async getTripsByStatus(
  status: TripStatus,
  query: { page?: number; limit?: number } = {},
): Promise<PagedDto<any>> {
  const { page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  const [data, total] = await this.tripRepository.findAndCount({
    where: { status },
    relations: ['driver', 'driver.user', 'vehicle'],
    skip,
    take: limit,
    order: { createdAt: 'DESC' },
  });

  const pagedDto = new PagedDto();
  pagedDto.data = data.map((t) => ({ ...t, availableSeats: t.totalSeats - (t.bookedSeats ?? 0) }));
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




// ─── Driver: Trip summary charts (PHP tripSummary) ─────────────────────────
// daily → 24 hourly buckets for today, weekly → Mon–Sun, monthly → days of
// the month, yearly → Jan–Dec. One grouped query per call instead of the
// Laravel version's N queries.

async getTripChartSummary(
  driverUserId: string,
  filterBy: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'daily',
) {
  const driver = await this.driverRepo.findOne({ where: { userId: driverUserId } });
  if (!driver) throw new NotFoundException('Driver profile not found');

  const now = new Date();
  let start: Date;
  let end: Date;
  let bucketExpr: string;

  switch (filterBy) {
    case 'weekly': {
      start = new Date(now);
      const day = (start.getDay() + 6) % 7; // Monday = 0
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 7);
      bucketExpr = `TO_CHAR(t.createdAt, 'FMDay')`;
      break;
    }
    case 'monthly': {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      bucketExpr = `TO_CHAR(t.createdAt, 'DD')`;
      break;
    }
    case 'yearly': {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear() + 1, 0, 1);
      bucketExpr = `TO_CHAR(t.createdAt, 'FMMonth')`;
      break;
    }
    case 'daily':
    default: {
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 1);
      bucketExpr = `TO_CHAR(t.createdAt, 'HH24')`;
      break;
    }
  }

  const rows: { bucket: string; total: string }[] = await this.tripRepository
    .createQueryBuilder('t')
    .select(bucketExpr, 'bucket')
    .addSelect('COUNT(*)', 'total')
    .where('t.driverId = :driverId', { driverId: driver.id })
    .andWhere('t.createdAt >= :start AND t.createdAt < :end', { start, end })
    .groupBy('bucket')
    .getRawMany();

  const counts = new Map(rows.map((r) => [r.bucket.trim(), Number(r.total)]));

  // Build full label sequence with zero-filled buckets (like the PHP loops)
  let labels: string[];
  let keys: string[];
  switch (filterBy) {
    case 'weekly':
      labels = keys = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      break;
    case 'monthly': {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      keys = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));
      labels = keys;
      break;
    }
    case 'yearly':
      labels = keys = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      break;
    case 'daily':
    default:
      keys = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
      labels = keys.map((h) => `${h}:00`);
      break;
  }

  const data = keys.map((k) => counts.get(k) ?? 0);

  // ── trip_summary: trips created in the window, PHP-shaped ──
  const trips = await this.tripRepository
    .createQueryBuilder('t')
    .leftJoinAndSelect('t.vehicle', 'vehicle')
    .leftJoinAndSelect('t.passengers', 'bookings')
    .where('t.driverId = :driverId', { driverId: driver.id })
    .andWhere('t.createdAt >= :start AND t.createdAt < :end', { start, end })
    .orderBy('t.createdAt', 'DESC')
    .getMany();

  const tripSummary = trips.map((trip) => {
    const spec = this.parseTripSpecification(trip.tripSpecification);
    const bookings = (trip.passengers ?? []).filter(
      (b) => ![BookingStatus.CANCELLED].includes(b.status),
    );
    const dest = Array.isArray(trip.arrivalDestination)
      ? trip.arrivalDestination[0] ?? {}
      : trip.arrivalDestination ?? {};

    return {
      id: trip.id,
      status: trip.status,
      destination: {
        pick_station: trip.pickStation ?? trip.departureLocation,
        drop_off_station: trip.dropOffStation ?? '',
      },
      departure: { date: trip.departureDate, time: trip.departureTime },
      arrival: {
        date: trip.arrivalDate ?? '',
        time: trip.arrivalTime ?? '',
        destination: dest?.name ?? '',
        address: dest?.address ?? '',
        latitude: String(dest?.latitude ?? ''),
        long: String(dest?.longitude ?? ''),
        bus_stop: trip.busStop ?? [],
      },
      vehicle: trip.vehicle ?? null,
      luggage_size: spec.luggage_size ?? null,
      charge_for_extra_luggage: spec.charge_for_extra_luggage ?? null,
      passenger_booked: bookings.reduce((s, b) => s + Number(b.seats ?? 0), 0),
      extra_luggage: bookings.reduce(
        (s, b) => s + Number(b.metadata?.extraLuggageCharge ?? 0),
        0,
      ),
      cost: spec.price ?? trip.price,
    };
  });

  return {
    activity_summary: { labels, data },
    trip_summary: tripSummary,
  };
}

// ─── Driver: Cancellation activity analytics (PHP activity) ────────────────
// Splits cancellations into driver- vs passenger-initiated and returns a
// reasons breakdown normalized to percentages.

async getTripActivity(driverUserId: string) {
  const driver = await this.driverRepo.findOne({ where: { userId: driverUserId } });
  if (!driver) throw new NotFoundException('Driver profile not found');

  // Trips this driver cancelled, grouped by reason.
  // COALESCE covers rows cancelled before the reason column was populated.
  const driverRows: { reason: string; total: string }[] = await this.tripRepository
    .createQueryBuilder('t')
    .select(
      `COALESCE(NULLIF(t.reasonForTripCancellation, ''), t.metadata->>'cancellationReason', 'unspecified')`,
      'reason',
    )
    .addSelect('COUNT(*)', 'total')
    .where('t.driverId = :driverId', { driverId: driver.id })
    .andWhere('t.status = :status', { status: TripStatus.CANCELLED })
    .groupBy('reason')
    .getRawMany();

  // Bookings passengers cancelled on this driver's trips, grouped by reason.
  // Driver-initiated trip cancellations stamp cancelledBy='driver' on the
  // booking metadata, so exclude those here.
  const passengerRows: { reason: string; total: string }[] = await this.bookingRepo
    .createQueryBuilder('b')
    .innerJoin(Trip, 't', 't.id = b.tripId')
    .select(`COALESCE(NULLIF(b.metadata->>'cancelReason', ''), 'unspecified')`, 'reason')
    .addSelect('COUNT(*)', 'total')
    .where('t.driverId = :driverId', { driverId: driver.id })
    .andWhere('b.status = :status', { status: BookingStatus.CANCELLED })
    .andWhere(`COALESCE(b.metadata->>'cancelledBy', 'passenger') != 'driver'`)
    .groupBy('reason')
    .getRawMany();

  const tripCancelledByDriver = driverRows.reduce((s, r) => s + Number(r.total), 0);
  const tripCancelledByPassenger = passengerRows.reduce((s, r) => s + Number(r.total), 0);

  // Merge both reason maps, then normalize to 100% (like the PHP loop)
  const reasons: Record<string, number> = {};
  for (const r of [...driverRows, ...passengerRows]) {
    reasons[r.reason] = (reasons[r.reason] ?? 0) + Number(r.total);
  }

  const totalCancellations = tripCancelledByDriver + tripCancelledByPassenger;
  if (totalCancellations > 0) {
    for (const reason of Object.keys(reasons)) {
      reasons[reason] = Math.round((reasons[reason] / totalCancellations) * 10000) / 100;
    }
  }

  return {
    total_cancellations: totalCancellations,
    trip_cancelled_by_driver: tripCancelledByDriver,
    trip_cancelled_by_passenger: tripCancelledByPassenger,
    reasons,
  };
}

    // ─── Internal: apply coupon ───────────────────────────────────────────────
  

  
private async applyCoupon(
  code: string | undefined,
  subtotal: number,
): Promise<{ discountAmount: number; couponId?: string }> {
  if (!code) return { discountAmount: 0 };

  const coupon = await this.couponRepo.findOne({
    where: { code: code.toUpperCase(), isActive: true },
  });
  if (!coupon) throw new BadRequestException('Invalid coupon code');

  if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt))
    throw new BadRequestException('This coupon has expired');
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)
    throw new BadRequestException('This coupon has reached its usage limit');
  if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount))
    throw new BadRequestException(`Minimum order amount is NGN ${coupon.minOrderAmount}`);

  let discountAmount =
    coupon.type === CouponType.PERCENTAGE
      ? (subtotal * Number(coupon.value)) / 100
      : Number(coupon.value);
  if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
  discountAmount = Math.min(discountAmount, subtotal);

  return { discountAmount, couponId: coupon.id };
}
  // ─── Internal: get trip owned by driver or throw ──────────────────────────

    private async getTripOwnedByDriver(userId: string, tripId: string): Promise<Trip> {
    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const trip = await this.tripRepository.findOne({ where: { id: tripId, driverId: driver.id } });
    if (!trip) throw new NotFoundException('Trip not found or does not belong to you');
    return trip;
  }


  private parseTripSpecification(spec: any): Record<string, any> {
  if (!spec) return {};
  if (Array.isArray(spec)) return spec[0] ?? {};
  if (typeof spec === 'object') return spec;
  if (typeof spec === 'string') {
    try { const d = JSON.parse(spec); return Array.isArray(d) ? (d[0] ?? {}) : (d ?? {}); }
    catch { return {}; }
  }
  return {};
}

    // ─── Internal: release escrows on trip completion ────────────────────────
  
    private async releaseEscrowsForTrip(tripId: string, manager: EntityManager) {
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
        await manager.increment(Driver, { id: escrow.driverId }, 'currentBalance', Number(escrow.netDriverAmount));
  
        this.logger.log(`Escrow ${escrow.reference} released → driver ${escrow.driverId} +${escrow.netDriverAmount}`);
      }
    }

  

  // ─── Internal: refund escrow for cancelled booking ────────────────────────

private async refundBookingEscrow(booking: Booking, manager: EntityManager) {
  // Escrow is linked by bookingId, not by its own primary key
  const escrow = await manager.findOne(Escrow, {
    where: { bookingId: booking.id },
  });
  if (!escrow || escrow.status !== EscrowStatus.HELD) return;

  // Initiate Paystack refund — if this fails, abort the whole cancellation
  // so we never mark money as refunded when it wasn't
  try {
    await this.paymentFactory.initiateRefund(
      booking.paymentReference,
      booking.amountPaid,
    );
  } catch (err) {
    this.logger.error(`Refund failed for booking ${booking.bookingCode}`, err);
    throw new BadRequestException(
      'Refund could not be processed. Please try again or contact support.',
    );
  }

  escrow.status = EscrowStatus.REFUNDED;
  escrow.refundedAt = new Date();
  await manager.save(Escrow, escrow);
}


private tokenizeLocation(value: string): string[] {
  return value
    .split(/[,/|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}
 
/**
 * Accepts DD-MM-YYYY, DD/MM/YYYY or YYYY-MM-DD; returns YYYY-MM-DD.
 * Returns null when the input can't be understood.
 */
private normalizeDate(input: string): string | null {
  const trimmed = input.trim();
 
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
 
  const m = trimmed.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    const month = Number(mm);
    const day = Number(dd);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${yyyy}-${mm}-${dd}`;
  }
 
  return null;
}


}




// import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Brackets, DeepPartial, EntityManager, FindManyOptions, Repository } from 'typeorm';
// import { Trip } from '@modules/core/entities/trip.entity';
// import { BookingStatus, CouponType, EscrowStatus, NotificationType, PaymentStatus, TicketStatus, TripStatus } from '../../types/enums';
// import { NotificationService } from '@modules/notification/services/notification.service';
// import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
// import { Driver } from '@modules/core/entities/driver.entity';
// import { BookTripDto, CancelBookingDto, CancelTripDto, CompleteTripDto, CreateTripDto, UpdateTripDto } from '@modules/trip/dtos/trip.dto';
// import { ExpoService } from '@modules/notification/services/expo.service';
// import { Escrow } from '@modules/core/entities/escro.entity';
// import { TripsService } from '@modules/trip/service/trip.service';
// import { Booking } from '@modules/core/entities/booking.entity';
// import { PaymentFactory } from '@adapters/payment/payment.factory';
// import { Passenger } from '@modules/core/entities/passenger.entity';
// import { Coupon } from '@modules/core/entities/coupon.entity';
// import { PagedDto } from '@shared/interface/paged.interface';
// import { Vehicle } from '@modules/core/entities/vehicle.entity';
// import { Payment } from '@modules/core/entities/payment.entity';


// /** Platform fee rate (deducted from driver payout) */
// const PLATFORM_FEE_RATE = parseFloat(process.env.PLATFORM_FEE_RATE ?? '5'); // 5%

// @Injectable()
// export class TripRepository extends Repository<Trip> {
//   private readonly logger = new Logger(TripsService.name);
//   constructor(
//     private readonly entityManager: EntityManager,
//     private readonly randomnessUtil: RandomnessUtil,
//     private readonly expoService: ExpoService,
//     private readonly notificationService: NotificationService,
//     private readonly paymentFactory: PaymentFactory,    
//     @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
//     @InjectRepository(Trip) private readonly tripRepository: Repository<Trip>,
//     @InjectRepository(Escrow) private readonly escrowRepo: Repository<Escrow>,
//     @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
//     @InjectRepository(Passenger) private readonly passengerRepo: Repository<Passenger>,
//     @InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>,
//     @InjectRepository(Vehicle) private readonly vehicleRepo: Repository<Vehicle>,

    
    
    
//   ) {
//     super(tripRepository.target, tripRepository.manager, tripRepository.queryRunner);
//   }

//       async createTrip(
//         userId: string,
//         dto: CreateTripDto,
//         entityManager?: EntityManager,
//       ): Promise<Trip> {

//         const manager = entityManager || this.entityManager;

//         const driver = await manager.findOne(Driver, {
//           where: { userId },
//         });

//         if (!driver) {
//           throw new NotFoundException('Driver profile not found');
//         }

//         if (!driver.licenseVerified) {
//   throw new BadRequestException(
//     "Please verify your driver's license before creating a trip",
//   );
// }

// const vehicleCount = await manager.count(Vehicle, {
//   where: { driverId: driver.id as any },
// });
// if (vehicleCount === 0) {
//   throw new BadRequestException(
//     'Please register a vehicle before creating a trip',
//   );
// }

//         const reference = this.randomnessUtil.generateReference('TRP');

//         const trip = manager.create(Trip, {
//           ...dto,
//           reference,
//           driverId: driver.id, 
//           status: TripStatus.PENDING,
//           //bookedSeats: 0,
//         });

//         return await manager.save(Trip, trip);
//       }


//       async activateTrip(id: string, tripId: string): Promise<Trip>{

//         const trip = await this.getTripOwnedByDriver(id, tripId);
//             if (trip.status !== TripStatus.PENDING)
//               throw new BadRequestException('Only pending trips can be activated');
        
//             trip.status = TripStatus.ACTIVE;
//             return this.tripRepository.save(trip);

//       }

//       async completeTrip(id: string, dto: CompleteTripDto, entityManager?: EntityManager,): Promise<Trip>{
//        const manager = entityManager || this.entityManager;
//       const trip = await this.getTripOwnedByDriver(id, dto.tripId);
//           if (![TripStatus.ACTIVE, TripStatus.STARTED].includes(trip.status))
//       throw new BadRequestException('Only active or started trips can be completed');


//         trip.status = TripStatus.COMPLETED;
//     if (dto.notes) trip.metadata = { ...(trip.metadata ?? {}), completionNotes: dto.notes };
//     await manager.save(Trip, trip);

//       // Release all held escrows for confirmed bookings on this trip
//     await this.releaseEscrowsForTrip(trip.id, manager);

//     // Grab confirmed bookings (with passengers) BEFORE flipping them,
//     // so we know who to notify afterwards
//     const confirmedBookings = await manager.find(Booking, {
//       where: { tripId: trip.id, status: BookingStatus.CONFIRMED },
//       relations: ['passenger'],
//     });

//          // Mark all confirmed bookings as completed
//            await manager.update(
//              Booking,
//              { tripId: trip.id, status: BookingStatus.CONFIRMED },
//              { status: BookingStatus.COMPLETED },
//            );

//     // Notify each passenger their trip is complete (best-effort,
//     // mirrors Laravel's TripCompletedNotification)
//     for (const booking of confirmedBookings) {
//       if (!booking.passenger?.userId) continue;
//       try {
//         await this.notificationService.notify({
//           userId: booking.passenger.userId,
//           title: 'Trip Completed',
//           body: `Your trip from ${trip.departureLocation} has been completed. Thanks for riding with us!`,
//           type: NotificationType.TRIP_COMPLETED,
//           data: { tripId: trip.id, bookingCode: booking.bookingCode },
//         });
//       } catch (err) {
//         this.logger.warn(`Failed to notify passenger for booking ${booking.bookingCode}: ${err?.message}`);
//       }
//     }
       
       
       
//            return trip;
           

//       }

//       async cancelTrip(id: string, dto: CancelTripDto, entityManager?: EntityManager): Promise<Trip> {
//   const manager = entityManager || this.entityManager;

//   const trip = await this.getTripOwnedByDriver(id, dto.tripId);
//   if (![TripStatus.PENDING, TripStatus.ACTIVE, TripStatus.STARTED].includes(trip.status))
//     throw new BadRequestException('Cannot cancel a completed or already-cancelled trip');

//   trip.status = TripStatus.CANCELLED;
//   trip.cancelledByDriver = true;                       // ← powers the activity() analytics
//   trip.reasonForTripCancellation = dto.reason ?? null; // ← powers the activity() analytics
//   trip.metadata = { ...(trip.metadata ?? {}), cancellationReason: dto.reason };
//   await manager.save(Trip, trip);

//   // Cancel + refund all confirmed/pending bookings
//   const bookings = await manager.find(Booking, {
//     where: { tripId: trip.id },
//     relations: ['passenger', 'passenger.user'],
//   });

//   const failedRefunds: string[] = [];

//   for (const booking of bookings) {
//     if (![BookingStatus.CONFIRMED, BookingStatus.PENDING].includes(booking.status)) continue;

//     // Refund directly via Paystack if this booking was paid
//     if (
//       booking.paymentStatus === PaymentStatus.SUCCESS &&
//       booking.paymentReference
//     ) {
//       try {
//         await this.paymentFactory.initiateRefund(
//           booking.paymentReference,
//           booking.amountPaid,
//         );
//         booking.paymentStatus = PaymentStatus.REFUNDED;
//         booking.metadata = {
//           ...(booking.metadata ?? {}),
//           refundedAt: new Date().toISOString(),
//           refundAmount: booking.amountPaid,
//         };
//       } catch (err) {
//         // Don't abort the loop — other passengers still need their refunds.
//         // Flag this booking so it can be retried later.
//         this.logger.error(
//           `Refund failed for booking ${booking.bookingCode} (trip ${trip.id})`,
//           err,
//         );
//         booking.metadata = {
//           ...(booking.metadata ?? {}),
//           refundFailed: true,
//           refundFailedAt: new Date().toISOString(),
//         };
//         failedRefunds.push(booking.bookingCode);
//       }
//     }

//     booking.status = BookingStatus.CANCELLED;
//     booking.metadata = { ...(booking.metadata ?? {}), cancelReason: dto.reason, cancelledBy: 'driver' };
//     await manager.save(Booking, booking);

//     // Notify each affected passenger (best-effort — a push failure
//     // must never abort the cancellation/refund loop)
//     if (booking.passenger?.userId) {
//       try {
//         await this.notificationService.notify({
//           userId: booking.passenger.userId,
//           title: 'Trip Cancelled',
//           body: `Your trip from ${trip.departureLocation} was cancelled by the driver. ${
//             booking.paymentStatus === PaymentStatus.REFUNDED
//               ? 'Your refund has been initiated.'
//               : ''
//           }`.trim(),
//           type: NotificationType.TRIP_CANCELLED,
//           data: { tripId: trip.id, bookingCode: booking.bookingCode, reason: dto.reason },
//         });
//       } catch (err) {
//         this.logger.warn(`Failed to notify passenger for booking ${booking.bookingCode}: ${err?.message}`);
//       }
//     }
//   }

//   if (failedRefunds.length) {
//     this.logger.warn(
//       `Trip ${trip.id} cancelled with ${failedRefunds.length} failed refund(s): ${failedRefunds.join(', ')}`,
//     );
//   }

//   return trip;
// }
    

  

//     async findByReference(reference: string): Promise<Trip> {
//       return this.findOne({ where: { reference }, relations: ['driver', 'vehicle'] });
//     }

//     async findActiveTrips(query: FindManyOptions<Trip> = {}): Promise<Trip[]> {
//       return this.find({ ...query, where: { status: TripStatus.ACTIVE, ...query.where } });
//     }

//     async updateTrip(
//       driverId: string,
//       tripId: string,
//       dto: UpdateTripDto,
//       entityManager?: EntityManager,
//     ): Promise<Trip> {
//       const manager = entityManager || this.entityManager;

//       // Get trip owned by driver
//       const trip = await this.getTripOwnedByDriver(driverId, tripId);

//       // Check confirmed bookings
//       const bookingCount = await this.bookingRepo.count({
//         where: {
//           tripId,
//           status: BookingStatus.CONFIRMED,
//         },
//       });

//       if (bookingCount > 0) {
//         throw new BadRequestException(
//           'Cannot edit a trip that already has confirmed bookings',
//         );
//       }

//       // Update trip fields
//       Object.assign(trip, dto);

//       // Save updated trip
//       return await manager.save(Trip, trip);
//     }

// async scanTicket(
//   driverUserId: string,
//   payload: { bookingCode: string; ticketToken: string },
//   entityManager?: EntityManager,
// ) {
//   const manager = entityManager || this.entityManager;

//   const driver = await this.driverRepo.findOne({ where: { userId: driverUserId } });
//   if (!driver) throw new NotFoundException('Driver profile not found');

//   const booking = await this.bookingRepo.findOne({
//     where: { bookingCode: payload.bookingCode },
//     relations: ['trip', 'passenger', 'passenger.user'],
//   });
//   if (!booking) throw new NotFoundException('Ticket not found');

//   // ownership — ticket must belong to this driver's trip
//   if (booking.trip?.driverId !== driver.id)
//     throw new ForbiddenException('This ticket is not for your trip');

//   // authenticity
//   if (!booking.ticketToken || booking.ticketToken !== payload.ticketToken)
//     throw new BadRequestException('Invalid ticket');

//   // must be paid & confirmed
//   if (booking.paymentStatus !== PaymentStatus.SUCCESS || booking.status !== BookingStatus.CONFIRMED)
//     throw new BadRequestException('Ticket is not active');

//   // idempotent — re-scanning never double-credits
//   if (booking.ticketStatus === TicketStatus.SCANNED) {
//     return { alreadyScanned: true, booking, credited: 0 };
//   }

//   booking.ticketStatus = TicketStatus.SCANNED;
//   booking.scannedAt = new Date();
//   booking.scannedBy = driver.id;
//   booking.isCheckedIn = true;
//   booking.checkedInAt = new Date();
//   await manager.save(Booking, booking);

//   const credited = await this.releaseEscrowForBooking(booking, manager);

//   // Confirmation to the passenger (mirrors Laravel's BookTripConfirmationNotification)
//   await this.notifyBookingVerified(booking);

//   return { success: true, booking, credited };
// }

// /** Best-effort push to the passenger when their booking is verified/scanned. */
// private async notifyBookingVerified(booking: Booking): Promise<void> {
//   const passengerUserId = booking.passenger?.userId ?? booking.passenger?.user?.id;
//   if (!passengerUserId) return;
//   try {
//     await this.notificationService.notify({
//       userId: passengerUserId,
//       title: 'Booking Verified',
//       body: `Your booking ${booking.bookingCode} has been verified. Enjoy your trip!`,
//       type: NotificationType.BOOKING_VERIFIED,
//       data: { bookingId: booking.id, bookingCode: booking.bookingCode, tripId: booking.tripId },
//     });
//   } catch (err) {
//     this.logger.warn(`Failed to send verification notification for ${booking.bookingCode}: ${err?.message}`);
//   }
// }

// // ─── Driver: Verify a booking manually by code (PHP verifyBookings) ────────
// // Fallback for when the QR can't be scanned (dead phone, broken screen).
// // Same guarantees as scanTicket: ownership check, idempotent, credits escrow.

// async verifyBookingByCode(
//   driverUserId: string,
//   bookingCode: string,
//   entityManager?: EntityManager,
// ) {
//   const manager = entityManager || this.entityManager;

//   const driver = await this.driverRepo.findOne({ where: { userId: driverUserId } });
//   if (!driver) throw new NotFoundException('Driver profile not found');

//   const booking = await this.bookingRepo.findOne({
//     where: { bookingCode },
//     relations: ['trip', 'passenger', 'passenger.user'],
//   });
//   if (!booking) throw new NotFoundException('Invalid booking code');

//   // ownership — booking must belong to this driver's trip
//   if (booking.trip?.driverId !== driver.id)
//     throw new ForbiddenException('This booking is not for your trip');

//   // must be paid & confirmed
//   if (booking.paymentStatus !== PaymentStatus.SUCCESS || booking.status !== BookingStatus.CONFIRMED)
//     throw new BadRequestException('Booking is not active (unpaid or cancelled)');

//   // idempotent — re-verifying never double-credits
//   if (booking.ticketStatus === TicketStatus.SCANNED) {
//     return { alreadyVerified: true, message: 'Already verified', booking, credited: 0 };
//   }

//   booking.ticketStatus = TicketStatus.SCANNED;
//   booking.scannedAt = new Date();
//   booking.scannedBy = driver.id;
//   booking.isCheckedIn = true;
//   booking.checkedInAt = new Date();
//   await manager.save(Booking, booking);

//   const credited = await this.releaseEscrowForBooking(booking, manager);

//   await this.notifyBookingVerified(booking);

//   return { success: true, message: 'Booking verified successfully', booking, credited };
// }

// // ─── Driver: Open/close bookings on a trip (PHP closeBookings) ─────────────
// // Uses the existing `bookingStatus` varchar column already on the entity.

// async setBookingStatus(
//   driverUserId: string,
//   tripId: string,
//   open: boolean,
//   entityManager?: EntityManager,
// ): Promise<Trip> {
//   const manager = entityManager || this.entityManager;

//   const trip = await this.getTripOwnedByDriver(driverUserId, tripId);

//   if (![TripStatus.PENDING, TripStatus.ACTIVE].includes(trip.status))
//     throw new BadRequestException('Bookings can only be toggled on upcoming or active trips');

//   trip.bookingStatus = open ? 'open' : 'closed';
//   return manager.save(Trip, trip);
// }

// // ─── Driver: Start trip (PHP actionsToPerformWhenTripIsStarted) ────────────
// // Marks the trip as STARTED and notifies every confirmed passenger.

// async startTrip(
//   driverUserId: string,
//   tripId: string,
//   entityManager?: EntityManager,
// ): Promise<Trip> {
//   const manager = entityManager || this.entityManager;

//   const trip = await this.getTripOwnedByDriver(driverUserId, tripId);
//   if (trip.status !== TripStatus.ACTIVE)
//     throw new BadRequestException('Only active trips can be started');

//   trip.status = TripStatus.STARTED;
//   trip.metadata = { ...(trip.metadata ?? {}), startedAt: new Date().toISOString() };
//   await manager.save(Trip, trip);

//   // Notify all confirmed passengers (mirrors Laravel's TripStartedNotification)
//   const bookings = await manager.find(Booking, {
//     where: { tripId: trip.id, status: BookingStatus.CONFIRMED },
//     relations: ['passenger'],
//   });

//   for (const booking of bookings) {
//     if (!booking.passenger?.userId) continue;
//     try {
//       await this.notificationService.notify({
//         userId: booking.passenger.userId,
//         title: 'Trip Started',
//         body: `Your trip from ${trip.departureLocation} has started.`,
//         type: NotificationType.TRIP_STARTED,
//         data: { tripId: trip.id, bookingCode: booking.bookingCode },
//       });
//     } catch (err) {
//       this.logger.warn(`Failed to send trip-started notification for ${booking.bookingCode}: ${err?.message}`);
//     }
//   }

//   return trip;
// }

// private async releaseEscrowForBooking(booking: Booking, manager: EntityManager): Promise<number> {
//   const escrow = await this.escrowRepo.findOne({ where: { bookingId: booking.id } });
//   if (!escrow || escrow.status !== EscrowStatus.HELD) return 0; // idempotent

//   escrow.status = EscrowStatus.RELEASED;
//   escrow.releasedAt = new Date();
//   escrow.releaseReason = 'Ticket scanned at boarding';
//   await manager.save(Escrow, escrow);

//   await manager.increment(
//     Driver,
//     { id: escrow.driverId },
//     'currentBalance',
//     Number(escrow.netDriverAmount),
//   );

//   this.logger.log(`Escrow ${escrow.reference} released on scan → driver ${escrow.driverId} +${escrow.netDriverAmount}`);
//   return Number(escrow.netDriverAmount);
// }

// async searchTripState(query: {
//   page?: number;
//   limit?: number;
//   state?: string;
//   status?: string;
// }): Promise<PagedDto<any>> {
//   const { page = 1, limit = 20, state, status } = query;

//   const skip = (page - 1) * limit;

//   const qb = this.tripRepository
//     .createQueryBuilder('trip')
//     .leftJoinAndSelect('trip.driver', 'driver')
//     .leftJoinAndSelect('driver.user', 'user')
//     .leftJoinAndSelect('trip.vehicle', 'vehicle');

//   if (status) {
//     qb.andWhere('trip.status = :status', { status });
//   }

//   if (state) {
//     qb.andWhere('trip.state ILIKE :state', { state: `%${state}%` });
//   }

//   qb.orderBy('trip.departureDate', 'ASC').addOrderBy('trip.departureTime', 'ASC');

//   const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

//   const pagedDto = new PagedDto();
//   pagedDto.data = data.map((t) => ({
//     ...t,
//     availableSeats: t.totalSeats - t.bookedSeats,
//   }));

//   pagedDto.meta = {
//     page,
//     limit,
//     count: data.length,
//     previousPage: page > 1 ? page - 1 : false,
//     nextPage: skip + limit < total ? page + 1 : false,
//     pageCount: Math.ceil(total / limit),
//     totalRecords: total,
//   };

//   return pagedDto;
// }


// async searchTrips(query: {
//   page?: number;
//   limit?: number;
//   origin?: string;
//   destination?: string;
//   date?: string;
//   seats?: number;
//   maxPrice?: number;
//   sortBy?: string;
//   status?: string;
//   state?: string;
//   location?: string;
// }): Promise<PagedDto<any>> {
//   const {
//     page = 1, limit = 20,
//     origin, destination, date, seats, maxPrice, sortBy, status,
//     state, location,
//   } = query;

//   const skip = (page - 1) * limit;

//   const qb = this.tripRepository
//     .createQueryBuilder('trip')
//     .leftJoinAndSelect('trip.driver', 'driver')
//     .leftJoinAndSelect('driver.user', 'user')
//     .leftJoinAndSelect('trip.vehicle', 'vehicle');

//   // Only filter by status if explicitly provided
//   if (status) {
//     qb.andWhere('trip.status = :status', { status });
//   }

//   if (origin) {
//     qb.andWhere('trip.departureLocation ILIKE :origin', { origin: `%${origin}%` });
//   }

//   if (destination) {
//     qb.andWhere('CAST(trip.arrivalDestination AS TEXT) ILIKE :destination', {
//       destination: `%${destination}%`,
//     });
//   }

//   // if (state) {
//   //   qb.andWhere('trip.state ILIKE :state', { state: `%${state}%` });
//   // }

//   if (location) {
//     qb.andWhere('trip.departureLocation ILIKE :location', { location: `%${location}%` });
//   }

//   if (date) {
//     qb.andWhere('trip.departureDate = :date', { date });
//   }

//   if (seats) {
//     qb.andWhere('(trip.totalSeats - trip.bookedSeats) >= :seats', { seats });
//   }

//   if (maxPrice) {
//     qb.andWhere('trip.price::numeric <= :maxPrice', { maxPrice });
//   }

//   switch (sortBy) {
//     case 'price':
//       qb.addSelect('trip.price::numeric', 'price_numeric')
//         .orderBy('price_numeric', 'ASC');
//       break;
//     case 'seats':
//       qb.addSelect('(trip.totalSeats - trip.bookedSeats)', 'available_seats')
//         .orderBy('available_seats', 'DESC');
//       break;
//     default:
//       qb.orderBy('trip.departureDate', 'ASC').addOrderBy('trip.departureTime', 'ASC');
//   }

//   const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

//   const pagedDto = new PagedDto();
//   pagedDto.data = data.map((t) => ({
//     ...t,
//     availableSeats: t.totalSeats - t.bookedSeats,
//   }));

//   pagedDto.meta = {
//     page,
//     limit,
//     count: data.length,
//     previousPage: page > 1 ? page - 1 : false,
//     nextPage: skip + limit < total ? page + 1 : false,
//     pageCount: Math.ceil(total / limit),
//     totalRecords: total,
//   };

//   return pagedDto;
// }



//   async getTripById(tripId: string) {
//   const trip = await this.tripRepository.findOne({
//     where: { id: tripId },
//     relations: ['driver', 'driver.user', 'vehicle'],
//   });
//   if (!trip) throw new NotFoundException('Trip not found');

//   const bookings = await this.bookingRepo.find({
//     where: { tripId: trip.id },
//     relations: ['passenger', 'passenger.user'],
//     order: { createdAt: 'DESC' },
//   });

//   return {
//     ...trip,
//     availableSeats: trip.totalSeats - (trip.bookedSeats ?? 0),
//     bookings,
//   };
// }

//   async bookTrip(userId: string, dto: BookTripDto, entityManager: EntityManager) {
//   const manager = entityManager || this.entityManager;

//   const trip = await this.tripRepository.findOne({
//     where: { id: dto.tripId },
//     relations: ['driver', 'driver.user', 'vehicle'],
//   });
//   if (!trip) throw new NotFoundException('Trip not found');
//   // if (trip.status !== TripStatus.ACTIVE)
//   //   throw new BadRequestException('This trip is not accepting bookings');

//   // ── driver manually closed bookings (mirrors Laravel closeBookings) ──
//   if (trip.bookingStatus === 'closed')
//     throw new BadRequestException('Bookings for this trip have been closed by the driver');

//   // ── time guards (mirrors Laravel) ──
//   const departure = new Date(`${trip.departureDate}T${trip.departureTime}`);
//   if (!isNaN(departure.getTime()) && departure.getTime() <= Date.now())
//     throw new BadRequestException("You can't book this trip — departure time has elapsed");

//   if (trip.bookingClosingDate && trip.bookingClosingTime) {
//     const closing = new Date(`${trip.bookingClosingDate}T${trip.bookingClosingTime}`);
//     if (!isNaN(closing.getTime()) && closing.getTime() <= Date.now())
//       throw new BadRequestException("You can't book this trip — booking time is over");
//   }

//   // ── seats (now respects bookedSeats) ──
//   const available = trip.totalSeats - (trip.bookedSeats ?? 0);
//   if (dto.seats > available)
//     throw new BadRequestException(`Only ${available} seat(s) available`);

//   const passenger = await this.passengerRepo.findOne({
//     where: { userId },
//     relations: ['user'],
//   });
//   if (!passenger) throw new NotFoundException('Passenger profile not found');

//   // ── duplicate pending booking (keys fixed) ──
//   const existing = await this.bookingRepo.findOne({
//     where: { tripId: trip.id, passengerId: passenger.id, status: BookingStatus.PENDING },
//   });
//   if (existing) throw new BadRequestException('You already have a pending booking for this trip');

//   // ── pricing: base × seats + extra luggage ──
//   const spec = this.parseTripSpecification(trip.tripSpecification);
//   const basePrice = Number(spec.price ?? trip.price ?? 0);
//   let totalAmount = basePrice * dto.seats;

//   const luggageSize = Number(spec.luggage_size ?? 0);
//   const luggageCharge = Number(spec.charge_for_extra_luggage ?? 0);
//   const totalWeight = (dto.extraLuggage ?? []).reduce((s, l) => s + Number(l.weight ?? 0), 0);
//   let extraLuggageCharge = 0;
//   if (luggageSize > 0 && totalWeight > 0) {
//     extraLuggageCharge = Math.ceil(totalWeight / luggageSize) * luggageCharge;
//     totalAmount += extraLuggageCharge;
//   }

//   // ── coupon (rejects invalid, like Laravel) ──
//   const { discountAmount, couponId } = await this.applyCoupon(dto.couponCode, totalAmount);

//   const amountPaid = Math.max(0, totalAmount - discountAmount);
//   const bookingCode = this.randomnessUtil.generateBookingCode(8);
//   const paymentReference = this.randomnessUtil.generateReference('BKG');

//   const booking = manager.create(Booking, {
//     bookingCode,
//     tripId: trip.id,
//     passengerId: passenger.id,
//     seats: dto.seats,
//     totalAmount,            // NGN — do NOT multiply by 100
//     discountAmount,
//     amountPaid,
//     status: BookingStatus.PENDING,
//     paymentStatus: PaymentStatus.PENDING,
//     paymentReference,
//     couponCode: dto.couponCode,
//     metadata: { extraLuggageCharge, totalBeforeDiscount: totalAmount },
//   });
//   const savedBooking = await manager.save(Booking, booking);

//   await manager.increment(Trip, { id: trip.id }, 'bookedSeats', dto.seats);
//   if (couponId) await manager.increment(Coupon, { id: couponId }, 'usageCount', 1);

//   const paymentRecord = manager.create(Payment, {
//   bookingId: savedBooking.id,
//   passengerId: passenger.id,
//   tripId: trip.id,
//   txRef: paymentReference,        // ← same reference used for Paystack
//   status: PaymentStatus.PENDING,
//   amount: amountPaid,
//   customerEmail: passenger.user.email,
//   customerName: `${passenger.user.firstName} ${passenger.user.lastName}`,
// });
// await manager.save(Payment, paymentRecord);

//   const payment = await this.paymentFactory.initiatePayment({
//     amount: amountPaid,
//     email: passenger.user.email,
//     reference: paymentReference,
//     callback_url: dto.callbackUrl,
//     metadata: {
//       bookingCode,
//       bookingId: savedBooking.id,
//       tripId: trip.id,
//       passengerId: passenger.id,
//       driverId: trip.driverId,
//       seats: dto.seats,
//       type: 'trip_booking',
//     },
//   });

//   return {
//     booking: savedBooking,
//     payment,
//     summary: {
//       departureTime: trip.departureTime,
//       seats: dto.seats,
//       pricePerSeat: basePrice,
//       extraLuggageCharge,
//       totalAmount,
//       discountAmount,
//       amountPaid,
//     },
//   };
// }


//   async confirmBookingPayment(  bookingId: string,
//     paymentReference: string,
//     entityManager: EntityManager,){

//     const manager = entityManager || this.entityManager;

//         const booking = await this.bookingRepo.findOne({
//       where: { id: bookingId },
//       relations: ['trip', 'passenger', 'passenger.user'],
//     });

//         if (!booking) throw new NotFoundException('Booking not found');
//     if (booking.status === BookingStatus.CONFIRMED) return booking; // idempotent

//     booking.status = BookingStatus.CONFIRMED;
//     booking.paymentStatus = PaymentStatus.SUCCESS;
//     booking.paymentReference = paymentReference;

//     // ── issue boarding ticket ──
//     booking.ticketToken = this.randomnessUtil.generateSecureToken(40);
//     booking.ticketStatus = TicketStatus.ISSUED;
//     booking.ticketIssuedAt = new Date();

//     await manager.save(Booking, booking);

//         // Create escrow record
//     const platformFee = (booking.amountPaid * PLATFORM_FEE_RATE) / 100;
//     const netDriverAmount = booking.amountPaid - platformFee;
//     const escrowRef = this.randomnessUtil.generateReference('ESC');

//    const escrow = manager.create(Escrow, {
//   reference: escrowRef,
//   bookingId: booking.id,
//   amount: booking.amountPaid,
//   platformFee,
//   netDriverAmount,
//   status: EscrowStatus.HELD,
//   driverId: booking.trip.driverId,
//   passengerId: booking.passengerId,
//   paymentReference,
// } as DeepPartial<Escrow>);

// await manager.save(escrow);

// return booking;

//   }

  

// async cancelBooking(id: string, dto: CancelBookingDto, entityManager?: EntityManager) {
//   const manager = entityManager || this.entityManager;

//   // `id` is the userId from the auth token
//   const passenger = await manager.findOne(Passenger, { where: { userId: id } });
//   if (!passenger) throw new NotFoundException('Passenger profile not found');

//   const booking = await manager.findOne(Booking, {
//     where: { id: dto.bookingId, passengerId: passenger.id },
//     relations: ['trip'],
//   });
//   if (!booking) throw new NotFoundException('Booking not found');

//   if (![BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(booking.status))
//     throw new BadRequestException('This booking cannot be cancelled');

//   // Cancellation window: at least 2 hours before departure
//   const hoursBeforeDeparture =
//     (new Date(booking.trip.departureTime).getTime() - Date.now()) / (1000 * 60 * 60);
//   if (hoursBeforeDeparture < 2)
//     throw new BadRequestException(
//       'Cancellations must be made at least 2 hours before departure',
//     );

//   // ── Refund via Paystack if the booking was paid ──
//   // Done BEFORE marking cancelled: if the refund fails, the booking
//   // stays untouched and the passenger can simply retry.
//   if (
//     booking.paymentStatus === PaymentStatus.SUCCESS &&
//     booking.paymentReference
//   ) {
//     try {
//       await this.paymentFactory.initiateRefund(
//         booking.paymentReference,
//         booking.amountPaid,
//       );
//     } catch (err) {
//       this.logger.error(`Refund failed for booking ${booking.bookingCode}`, err);
//       throw new BadRequestException(
//         'Refund could not be processed. Please try again or contact support.',
//       );
//     }
//     booking.paymentStatus = PaymentStatus.REFUNDED;
//   }

//   booking.status = BookingStatus.CANCELLED;
//   booking.metadata = {
//     ...(booking.metadata ?? {}),
//     cancelReason: dto.reason,
//     ...(booking.paymentStatus === PaymentStatus.REFUNDED && {
//       refundedAt: new Date().toISOString(),
//       refundAmount: booking.amountPaid,
//     }),
//   };
//   await manager.save(Booking, booking);

//   // Release locked seats
//   await manager.decrement(Trip, { id: booking.tripId }, 'bookedSeats', booking.seats);

//   return { message: 'Booking cancelled and refund initiated', booking };
// }


//   async getMyBookings(userId: string, query: { page?: number; limit?: number; status?: string }) {
//     const passenger = await this.passengerRepo.findOne({ where: { userId } });
//     if (!passenger) throw new NotFoundException('Passenger profile not found');

//     const { page = 1, limit = 20, status } = query;
//     const skip = (page - 1) * limit;

//     const where: any = { passengerId: passenger.id };
//     if (status) where.status = status;

//     const [data, total] = await this.bookingRepo.findAndCount({
//       where,
//       skip,
//       take: limit,
//       relations: ['trip', 'trip.driver', 'trip.driver.user', 'trip.vehicle'],
//       order: { createdAt: 'DESC' },
//     });

//     return { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
//   }


  
//   async getMyTrips(userId: string, query: { page?: number; limit?: number; status?: string }) {
//     const driver = await this.driverRepo.findOne({ where: { userId } });
//     if (!driver) throw new NotFoundException('Driver profile not found');

//     const { page = 1, limit = 20, status } = query;
//     const skip = (page - 1) * limit;

//     const where: any = { driverId: driver.id };
//     if (status) where.status = status;

//     const [data, total] = await this.tripRepository.findAndCount({
//       where,
//       skip,
//       take: limit,
//       relations: ['vehicle', 'driver', 'driver.user'],
//       order: { departureTime: 'DESC' },
//     });

//       const pagedDto = new PagedDto();
//       pagedDto.data = data.map((t) => ({...t,availableSeats: t.totalSeats,}));

//           pagedDto.meta = {
//               page,
//               limit,
//               count: data.length,
//               previousPage: page > 1 ? page - 1 : false,
//               nextPage: skip + limit < total ? page + 1 : false,
//               pageCount: Math.ceil(total / limit),
//               totalRecords: total,
//             };
        
//             return pagedDto;


//   }


//   async getTripBookings(id: string, tripId: string, search?: string) {
//     await this.getTripOwnedByDriver(id, tripId);

//     const qb = this.bookingRepo
//       .createQueryBuilder('b')
//       .leftJoinAndSelect('b.passenger', 'p')
//       .leftJoinAndSelect('p.user', 'u')
//       .where('b.tripId = :tripId', { tripId })
//       .orderBy('b.createdAt', 'DESC');

//     // ── PHP passengerInfo search: name / email / phone / booking code / status ──
//     if (search?.trim()) {
//       const term = `%${search.trim()}%`;
//       qb.andWhere(
//         new Brackets((w) => {
//           w.where('u.firstName ILIKE :term', { term })
//             .orWhere('u.lastName ILIKE :term', { term })
//             .orWhere('u.email ILIKE :term', { term })
//             .orWhere('u.phone ILIKE :term', { term })
//             .orWhere('b.bookingCode ILIKE :term', { term })
//             .orWhere('CAST(b.status AS TEXT) ILIKE :term', { term });
//         }),
//       );
//     }

//     return qb.getMany();
//   }

//   async checkInPassenger(userId: string, bookingId: string){
//     const driver = await this.driverRepo.findOne({ where: { userId } });
//         if (!driver) throw new NotFoundException('Driver profile not found');
    
//         const booking = await this.bookingRepo.findOne({
//           where: { id: bookingId },
//           relations: ['trip'],
//         });
//         if (!booking) throw new NotFoundException('Booking not found');
//         if (booking.trip.driverId !== driver.id)
//           throw new ForbiddenException('This booking is not on your trip');
//         if (booking.status !== BookingStatus.CONFIRMED)
//           throw new BadRequestException('Passenger must have a confirmed booking to check in');
    
//         booking.isCheckedIn = true;
//         booking.checkedInAt = new Date();
//         return this.bookingRepo.save(booking);
//   }

//    async getBookingByCode( id: string, bookingCode: string,) {
//       const passenger = await this.passengerRepo.findOne({ where: { id } });
//       const booking = await this.bookingRepo.findOne({
//         where: { bookingCode },
//         relations: ['trip', 'trip.driver', 'trip.driver.user', 'trip.vehicle'],
//       });
//       if (!booking) throw new NotFoundException('Booking not found');
//       if (passenger && booking.passengerId !== passenger.id)
//         throw new ForbiddenException('This booking does not belong to you');
//       return booking;
//     }


//   /**
//  * Returns trip counts grouped by status.
//  * Pass a driverId to scope it to one driver; omit for a platform-wide tally.
//  */
// async getTripStatusCounts(driverId?: string): Promise<{
//   pending: number;
//   active: number;
//   completed: number;
//   cancelled: number;
//   total: number;
// }> {
//   const base = driverId ? { driverId } : {};

//   const [pending, active, completed, cancelled] = await Promise.all([
//     this.tripRepository.count({ where: { ...base, status: TripStatus.PENDING } }),
//     this.tripRepository.count({ where: { ...base, status: TripStatus.ACTIVE } }),
//     this.tripRepository.count({ where: { ...base, status: TripStatus.COMPLETED } }),
//     this.tripRepository.count({ where: { ...base, status: TripStatus.CANCELLED } }),
//   ]);

//   return {
//     pending,
//     active,
//     completed,
//     cancelled,
//     total: pending + active + completed + cancelled,
//   };
// }

// async getTripsByStatus(
//   status: TripStatus,
//   query: { page?: number; limit?: number } = {},
// ): Promise<PagedDto<any>> {
//   const { page = 1, limit = 20 } = query;
//   const skip = (page - 1) * limit;

//   const [data, total] = await this.tripRepository.findAndCount({
//     where: { status },
//     relations: ['driver', 'driver.user', 'vehicle'],
//     skip,
//     take: limit,
//     order: { createdAt: 'DESC' },
//   });

//   const pagedDto = new PagedDto();
//   pagedDto.data = data.map((t) => ({ ...t, availableSeats: t.totalSeats - (t.bookedSeats ?? 0) }));
//   pagedDto.meta = {
//     page,
//     limit,
//     count: data.length,
//     previousPage: page > 1 ? page - 1 : false,
//     nextPage: skip + limit < total ? page + 1 : false,
//     pageCount: Math.ceil(total / limit),
//     totalRecords: total,
//   };
//   return pagedDto;
// }




// // ─── Driver: Trip summary charts (PHP tripSummary) ─────────────────────────
// // daily → 24 hourly buckets for today, weekly → Mon–Sun, monthly → days of
// // the month, yearly → Jan–Dec. One grouped query per call instead of the
// // Laravel version's N queries.

// async getTripChartSummary(
//   driverUserId: string,
//   filterBy: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'daily',
// ) {
//   const driver = await this.driverRepo.findOne({ where: { userId: driverUserId } });
//   if (!driver) throw new NotFoundException('Driver profile not found');

//   const now = new Date();
//   let start: Date;
//   let end: Date;
//   let bucketExpr: string;

//   switch (filterBy) {
//     case 'weekly': {
//       start = new Date(now);
//       const day = (start.getDay() + 6) % 7; // Monday = 0
//       start.setDate(start.getDate() - day);
//       start.setHours(0, 0, 0, 0);
//       end = new Date(start);
//       end.setDate(end.getDate() + 7);
//       bucketExpr = `TO_CHAR(t.createdAt, 'FMDay')`;
//       break;
//     }
//     case 'monthly': {
//       start = new Date(now.getFullYear(), now.getMonth(), 1);
//       end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
//       bucketExpr = `TO_CHAR(t.createdAt, 'DD')`;
//       break;
//     }
//     case 'yearly': {
//       start = new Date(now.getFullYear(), 0, 1);
//       end = new Date(now.getFullYear() + 1, 0, 1);
//       bucketExpr = `TO_CHAR(t.createdAt, 'FMMonth')`;
//       break;
//     }
//     case 'daily':
//     default: {
//       start = new Date(now);
//       start.setHours(0, 0, 0, 0);
//       end = new Date(start);
//       end.setDate(end.getDate() + 1);
//       bucketExpr = `TO_CHAR(t.createdAt, 'HH24')`;
//       break;
//     }
//   }

//   const rows: { bucket: string; total: string }[] = await this.tripRepository
//     .createQueryBuilder('t')
//     .select(bucketExpr, 'bucket')
//     .addSelect('COUNT(*)', 'total')
//     .where('t.driverId = :driverId', { driverId: driver.id })
//     .andWhere('t.createdAt >= :start AND t.createdAt < :end', { start, end })
//     .groupBy('bucket')
//     .getRawMany();

//   const counts = new Map(rows.map((r) => [r.bucket.trim(), Number(r.total)]));

//   // Build full label sequence with zero-filled buckets (like the PHP loops)
//   let labels: string[];
//   let keys: string[];
//   switch (filterBy) {
//     case 'weekly':
//       labels = keys = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
//       break;
//     case 'monthly': {
//       const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
//       keys = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));
//       labels = keys;
//       break;
//     }
//     case 'yearly':
//       labels = keys = [
//         'January', 'February', 'March', 'April', 'May', 'June',
//         'July', 'August', 'September', 'October', 'November', 'December',
//       ];
//       break;
//     case 'daily':
//     default:
//       keys = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
//       labels = keys.map((h) => `${h}:00`);
//       break;
//   }

//   const data = keys.map((k) => counts.get(k) ?? 0);

//   // ── trip_summary: trips created in the window, PHP-shaped ──
//   const trips = await this.tripRepository
//     .createQueryBuilder('t')
//     .leftJoinAndSelect('t.vehicle', 'vehicle')
//     .leftJoinAndSelect('t.passengers', 'bookings')
//     .where('t.driverId = :driverId', { driverId: driver.id })
//     .andWhere('t.createdAt >= :start AND t.createdAt < :end', { start, end })
//     .orderBy('t.createdAt', 'DESC')
//     .getMany();

//   const tripSummary = trips.map((trip) => {
//     const spec = this.parseTripSpecification(trip.tripSpecification);
//     const bookings = (trip.passengers ?? []).filter(
//       (b) => ![BookingStatus.CANCELLED].includes(b.status),
//     );
//     const dest = Array.isArray(trip.arrivalDestination)
//       ? trip.arrivalDestination[0] ?? {}
//       : trip.arrivalDestination ?? {};

//     return {
//       id: trip.id,
//       status: trip.status,
//       destination: {
//         pick_station: trip.pickStation ?? trip.departureLocation,
//         drop_off_station: trip.dropOffStation ?? '',
//       },
//       departure: { date: trip.departureDate, time: trip.departureTime },
//       arrival: {
//         date: trip.arrivalDate ?? '',
//         time: trip.arrivalTime ?? '',
//         destination: dest?.name ?? '',
//         address: dest?.address ?? '',
//         latitude: String(dest?.latitude ?? ''),
//         long: String(dest?.longitude ?? ''),
//         bus_stop: trip.busStop ?? [],
//       },
//       vehicle: trip.vehicle ?? null,
//       luggage_size: spec.luggage_size ?? null,
//       charge_for_extra_luggage: spec.charge_for_extra_luggage ?? null,
//       passenger_booked: bookings.reduce((s, b) => s + Number(b.seats ?? 0), 0),
//       extra_luggage: bookings.reduce(
//         (s, b) => s + Number(b.metadata?.extraLuggageCharge ?? 0),
//         0,
//       ),
//       cost: spec.price ?? trip.price,
//     };
//   });

//   return {
//     activity_summary: { labels, data },
//     trip_summary: tripSummary,
//   };
// }

// // ─── Driver: Cancellation activity analytics (PHP activity) ────────────────
// // Splits cancellations into driver- vs passenger-initiated and returns a
// // reasons breakdown normalized to percentages.

// async getTripActivity(driverUserId: string) {
//   const driver = await this.driverRepo.findOne({ where: { userId: driverUserId } });
//   if (!driver) throw new NotFoundException('Driver profile not found');

//   // Trips this driver cancelled, grouped by reason.
//   // COALESCE covers rows cancelled before the reason column was populated.
//   const driverRows: { reason: string; total: string }[] = await this.tripRepository
//     .createQueryBuilder('t')
//     .select(
//       `COALESCE(NULLIF(t.reasonForTripCancellation, ''), t.metadata->>'cancellationReason', 'unspecified')`,
//       'reason',
//     )
//     .addSelect('COUNT(*)', 'total')
//     .where('t.driverId = :driverId', { driverId: driver.id })
//     .andWhere('t.status = :status', { status: TripStatus.CANCELLED })
//     .groupBy('reason')
//     .getRawMany();

//   // Bookings passengers cancelled on this driver's trips, grouped by reason.
//   // Driver-initiated trip cancellations stamp cancelledBy='driver' on the
//   // booking metadata, so exclude those here.
//   const passengerRows: { reason: string; total: string }[] = await this.bookingRepo
//     .createQueryBuilder('b')
//     .innerJoin(Trip, 't', 't.id = b.tripId')
//     .select(`COALESCE(NULLIF(b.metadata->>'cancelReason', ''), 'unspecified')`, 'reason')
//     .addSelect('COUNT(*)', 'total')
//     .where('t.driverId = :driverId', { driverId: driver.id })
//     .andWhere('b.status = :status', { status: BookingStatus.CANCELLED })
//     .andWhere(`COALESCE(b.metadata->>'cancelledBy', 'passenger') != 'driver'`)
//     .groupBy('reason')
//     .getRawMany();

//   const tripCancelledByDriver = driverRows.reduce((s, r) => s + Number(r.total), 0);
//   const tripCancelledByPassenger = passengerRows.reduce((s, r) => s + Number(r.total), 0);

//   // Merge both reason maps, then normalize to 100% (like the PHP loop)
//   const reasons: Record<string, number> = {};
//   for (const r of [...driverRows, ...passengerRows]) {
//     reasons[r.reason] = (reasons[r.reason] ?? 0) + Number(r.total);
//   }

//   const totalCancellations = tripCancelledByDriver + tripCancelledByPassenger;
//   if (totalCancellations > 0) {
//     for (const reason of Object.keys(reasons)) {
//       reasons[reason] = Math.round((reasons[reason] / totalCancellations) * 10000) / 100;
//     }
//   }

//   return {
//     total_cancellations: totalCancellations,
//     trip_cancelled_by_driver: tripCancelledByDriver,
//     trip_cancelled_by_passenger: tripCancelledByPassenger,
//     reasons,
//   };
// }

//     // ─── Internal: apply coupon ───────────────────────────────────────────────
  

  
// private async applyCoupon(
//   code: string | undefined,
//   subtotal: number,
// ): Promise<{ discountAmount: number; couponId?: string }> {
//   if (!code) return { discountAmount: 0 };

//   const coupon = await this.couponRepo.findOne({
//     where: { code: code.toUpperCase(), isActive: true },
//   });
//   if (!coupon) throw new BadRequestException('Invalid coupon code');

//   if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt))
//     throw new BadRequestException('This coupon has expired');
//   if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)
//     throw new BadRequestException('This coupon has reached its usage limit');
//   if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount))
//     throw new BadRequestException(`Minimum order amount is NGN ${coupon.minOrderAmount}`);

//   let discountAmount =
//     coupon.type === CouponType.PERCENTAGE
//       ? (subtotal * Number(coupon.value)) / 100
//       : Number(coupon.value);
//   if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
//   discountAmount = Math.min(discountAmount, subtotal);

//   return { discountAmount, couponId: coupon.id };
// }
//   // ─── Internal: get trip owned by driver or throw ──────────────────────────

//     private async getTripOwnedByDriver(userId: string, tripId: string): Promise<Trip> {
//     const driver = await this.driverRepo.findOne({ where: { userId } });
//     if (!driver) throw new NotFoundException('Driver profile not found');

//     const trip = await this.tripRepository.findOne({ where: { id: tripId, driverId: driver.id } });
//     if (!trip) throw new NotFoundException('Trip not found or does not belong to you');
//     return trip;
//   }


//   private parseTripSpecification(spec: any): Record<string, any> {
//   if (!spec) return {};
//   if (Array.isArray(spec)) return spec[0] ?? {};
//   if (typeof spec === 'object') return spec;
//   if (typeof spec === 'string') {
//     try { const d = JSON.parse(spec); return Array.isArray(d) ? (d[0] ?? {}) : (d ?? {}); }
//     catch { return {}; }
//   }
//   return {};
// }

//     // ─── Internal: release escrows on trip completion ────────────────────────
  
//     private async releaseEscrowsForTrip(tripId: string, manager: EntityManager) {
//       const escrows = await this.escrowRepo.find({
//         where: {
//           status: EscrowStatus.HELD,
//         },
//         relations: ['booking'],
//       });
  
//       const tripEscrows = escrows.filter((e) => e.booking?.tripId === tripId);
  
//       for (const escrow of tripEscrows) {
//         escrow.status = EscrowStatus.RELEASED;
//         escrow.releasedAt = new Date();
//         escrow.releaseReason = 'Trip completed';
//         await manager.save(Escrow, escrow);
  
//         // Credit driver wallet
//         await manager.increment(Driver, { id: escrow.driverId }, 'currentBalance', Number(escrow.netDriverAmount));
  
//         this.logger.log(`Escrow ${escrow.reference} released → driver ${escrow.driverId} +${escrow.netDriverAmount}`);
//       }
//     }

  

//   // ─── Internal: refund escrow for cancelled booking ────────────────────────

// private async refundBookingEscrow(booking: Booking, manager: EntityManager) {
//   // Escrow is linked by bookingId, not by its own primary key
//   const escrow = await manager.findOne(Escrow, {
//     where: { bookingId: booking.id },
//   });
//   if (!escrow || escrow.status !== EscrowStatus.HELD) return;

//   // Initiate Paystack refund — if this fails, abort the whole cancellation
//   // so we never mark money as refunded when it wasn't
//   try {
//     await this.paymentFactory.initiateRefund(
//       booking.paymentReference,
//       booking.amountPaid,
//     );
//   } catch (err) {
//     this.logger.error(`Refund failed for booking ${booking.bookingCode}`, err);
//     throw new BadRequestException(
//       'Refund could not be processed. Please try again or contact support.',
//     );
//   }

//   escrow.status = EscrowStatus.REFUNDED;
//   escrow.refundedAt = new Date();
//   await manager.save(Escrow, escrow);
// }
// }


