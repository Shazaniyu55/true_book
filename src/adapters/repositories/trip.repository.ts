import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, FindManyOptions, Repository } from 'typeorm';
import { Trip } from '@modules/core/entities/trip.entity';
import { BookingStatus, CouponType, EscrowStatus, PaymentStatus, TicketStatus, TripStatus } from '../../types/enums';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { Driver } from '@modules/core/entities/driver.entity';
import { BookTripDto, CancelBookingDto, CancelTripDto, CompleteTripDto, CreateTripDto, SearchTripsDto, UpdateTripDto } from '@modules/trip/dtos/trip.dto';
import { ExpoService } from '@modules/notification/services/expo.service';
import { Escrow } from '@modules/core/entities/escro.entity';
import { TripsService } from '@modules/trip/service/trip.service';
import { Booking } from '@modules/core/entities/booking.entity';
import { PaymentFactory } from '@adapters/payment/payment.factory';
import { Passenger } from '@modules/core/entities/passenger.entity';
import { Coupon } from '@modules/core/entities/coupon.entity';
import { PagedDto } from '@shared/interface/paged.interface';
import { Vehicle } from '@modules/core/entities/vehicle.entity';


/** Platform fee rate (deducted from driver payout) */
const PLATFORM_FEE_RATE = parseFloat(process.env.PLATFORM_FEE_RATE ?? '5'); // 5%

@Injectable()
export class TripRepository extends Repository<Trip> {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    private readonly entityManager: EntityManager,
    private readonly randomnessUtil: RandomnessUtil,
    private readonly expoService: ExpoService,
    private readonly paymentFactory: PaymentFactory,
    
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Trip) private readonly tripRepository: Repository<Trip>,
    @InjectRepository(Escrow) private readonly escrowRepo: Repository<Escrow>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Passenger) private readonly passengerRepo: Repository<Passenger>,
    @InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>,

    @InjectRepository(Vehicle) private readonly vehicleRepo: Repository<Vehicle>,

    
    
    
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
       
       
       
           return trip;
           

      }

      async cancelTrip(id: string, dto: CancelTripDto, entityManager?: EntityManager,): Promise<Trip>{
        const manager = entityManager || this.entityManager;
         const trip = await this.getTripOwnedByDriver(id, dto.tripId);
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
     
        
      }
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

  return { success: true, booking, credited };
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
    'walletBalance',
    Number(escrow.netDriverAmount),
  );

  this.logger.log(`Escrow ${escrow.reference} released on scan → driver ${escrow.driverId} +${escrow.netDriverAmount}`);
  return Number(escrow.netDriverAmount);
}

async searchTrips(query: {page?: number, limit?:number, origin?: string, destination?:string, date?:string, seats?:number, maxPrice?:number, sortBy?:string, status?:string}): Promise<PagedDto<any>> {
        const { page = 1, limit = 20, origin, destination, date, seats, maxPrice, sortBy, status } = query;
        const skip = (page - 1) * limit;
    
        const qb = this.tripRepository.createQueryBuilder('trip')
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


    async getTripById(tripId: string) {
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
      relations: ['driver', 'driver.user', 'vehicle'],
    });
    if (!trip) throw new NotFoundException('Trip not found');
    return { ...trip, availableSeats: trip.totalSeats  };
  }


  async bookTrip(userId: string, dto: BookTripDto, entityManager: EntityManager){
      const manager = entityManager || this.entityManager;
        const trip = await this.tripRepository.findOne({
      where: { id: dto.tripId },
      relations: ['driver', 'driver.user'],
    });

        if (!trip) throw new NotFoundException('Trip not found');
    if (trip.status !== TripStatus.ACTIVE)
      throw new BadRequestException('This trip is not accepting bookings');

        const available = trip.totalSeats ;
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
        id: trip.id,
        passengerId: passenger.userId,
        status: BookingStatus.PENDING,
      },
    });

    if (existing) throw new BadRequestException('You already have a pending booking for this trip');
      const { discountAmount, couponId } = await this.applyCoupon(dto.couponCode, trip.price * dto.seats);

       const totalAmount = trip.price * dto.seats;
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

       return {
      booking: savedBooking,
      payment,
      summary: {
        // origin: trip.origin,
        // destination: trip.destination,
        departureTime: trip.departureTime,
        seats: dto.seats,
        pricePerSeat: trip.price,
        totalAmount,
        discountAmount,
        amountPaid,
      },
    };

  }

  async confirmBookingPayment(  bookingId: string,
    paymentReference: string,
    entityManager: EntityManager,){

    const manager = entityManager || this.entityManager;

        const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['trip', 'passenger', 'passenger.user'],
    });

        if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status === BookingStatus.CONFIRMED) return booking; // idempotent

    booking.status = BookingStatus.CONFIRMED;
    booking.paymentStatus = PaymentStatus.SUCCESS;
    booking.paymentReference = paymentReference;

    // ── issue boarding ticket ──
    booking.ticketToken = this.randomnessUtil.generateSecureToken(40);
    booking.ticketStatus = TicketStatus.ISSUED;
    booking.ticketIssuedAt = new Date();

    await manager.save(Booking, booking);

        // Create escrow record
    const platformFee = (booking.amountPaid * PLATFORM_FEE_RATE) / 100;
    const netDriverAmount = booking.amountPaid - platformFee;
    const escrowRef = this.randomnessUtil.generateReference('ESC');

   const escrow = manager.create(Escrow, {
  reference: escrowRef,
  bookingId: booking.id,
  amount: booking.amountPaid,
  platformFee,
  netDriverAmount,
  status: EscrowStatus.HELD,
  driverId: booking.trip.driverId,
  passengerId: booking.passengerId,
  paymentReference,
} as DeepPartial<Escrow>);

await manager.save(escrow);

return booking;

  }

  async cancelBooking(id: string, dto: CancelBookingDto, entityManager?: EntityManager){
      const manager = entityManager || this.entityManager;
          const passenger = await this.passengerRepo.findOne({ where: { id } });
    if (!passenger) throw new NotFoundException('Passenger profile not found');
      const booking = await this.bookingRepo.findOne({
      where: { id: dto.bookingId, passengerId: passenger.id },
      relations: ['trips'],
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
        return { message: 'Booking cancelled successfully', booking };



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

    // return {
    //   data: data.map((t) => ({ ...t, availableSeats: t.totalSeats - t.bookedSeats })),
    //   meta: { page, limit, total, pages: Math.ceil(total / limit) },
    // };
  }


  async getTripBookings(id: string, tripId: string) {
    await this.getTripOwnedByDriver(id, tripId);

    return this.bookingRepo.find({
      where: { tripId },
      relations: ['passenger', 'passenger.user'],
      order: { createdAt: 'DESC' },
    });
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

   async getBookingByCode(bookingCode: string, id: string) {
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


    // ─── Internal: apply coupon ───────────────────────────────────────────────
  
    private async applyCoupon(
      code: string | undefined,
      subtotal: number,
    ): Promise<{ discountAmount: number; couponId?: string }> {
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

    private async getTripOwnedByDriver(userId: string, tripId: string): Promise<Trip> {
    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const trip = await this.tripRepository.findOne({ where: { id: tripId, driverId: driver.id } });
    if (!trip) throw new NotFoundException('Trip not found or does not belong to you');
    return trip;
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
        await manager.increment(Driver, { id: escrow.driverId }, 'walletBalance', Number(escrow.netDriverAmount));
  
        this.logger.log(`Escrow ${escrow.reference} released → driver ${escrow.driverId} +${escrow.netDriverAmount}`);
      }
    }

    // ─── Internal: refund escrow for cancelled booking ────────────────────────

    private async refundBookingEscrow(booking: Booking, manager: EntityManager) {
    const escrow = await this.escrowRepo.findOne({ where: { id: booking.id } });
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
}
