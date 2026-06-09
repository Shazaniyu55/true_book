import {

  Injectable,
} from '@nestjs/common';
import {  EntityManager } from 'typeorm';
import * as QRCode from 'qrcode';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Trip } from '@modules/core/entities/trip.entity';
import { Driver } from '@modules/core/entities/driver.entity';
import { Passenger } from '@modules/core/entities/passenger.entity';


import {
  BookTripDto,
  CancelBookingDto,
  CancelTripDto,
  CompleteTripDto,
  CreateTripDto,
  ScanTicketDto,
  SearchTripsDto,
  TripListQueryDto,
  UpdateTripDto,
} from '../dtos/trip.dto';
import { TripRepository } from '@adapters/repositories/trip.repository';
import { TicketStatus } from 'src/types/enums';



@Injectable()
export class TripsService {

  constructor(
    private readonly tripRepository: TripRepository
  ) {}

  // ─── Driver: Create trip ──────────────────────────────────────────────────
async createTrip(
  id: string,
  dto: CreateTripDto,
  entityManager?: EntityManager,
): Promise<Trip> {


  const trip = await this.tripRepository.createTrip(
    id,
    dto,
    entityManager,
  );

  return trip;
}
  // ─── Driver: Activate/publish trip ───────────────────────────────────────

async activateTrip(userId: string, tripId: string): Promise<Trip> {
  return await this.tripRepository.activateTrip(userId, tripId);
}

  // ─── Driver: Complete trip → release escrow ───────────────────────────────

  async completeTrip(id: string, dto: CompleteTripDto): Promise<Trip> {
    return await this.tripRepository.completeTrip(id, dto);
  }

  // ─── Driver: Cancel trip → refund all bookings ────────────────────────────

  async cancelTrip(id: string, dto: CancelTripDto): Promise<Trip> {
    return await this.tripRepository.cancelTrip(id, dto);
  }

  // ─── Driver: Update trip (before first booking only) ─────────────────────

  async updateTrip(id: string, tripId: string, dto: UpdateTripDto): Promise<Trip> {
    return await  this.tripRepository.updateTrip(id, tripId, dto);
  }

  // ─── Passenger: Search trips ──────────────────────────────────────────────

  async searchTrips(query: SearchTripsDto) {
    return await this.tripRepository.searchTrips(query);
  }

  async scanTicket(driverUserId: string, dto: ScanTicketDto, em?: EntityManager) {
  return this.tripRepository.scanTicket(driverUserId, dto, em);
}

  // ─── Passenger: Get single trip ───────────────────────────────────────────

  async getTripById(tripId: string) {
   return await this.tripRepository.getTripById(tripId);
  }

  // ─── Passenger: Book trip → initiate payment → hold escrow ───────────────

  async bookTrip(id: string, dto: BookTripDto,   entityManager?: EntityManager,
) {
   return await this.tripRepository.bookTrip(id, dto, entityManager);
  }

  // ─── Called by webhook: payment confirmed → create escrow ─────────────────

  async confirmBookingPayment(
    bookingId: string,
    paymentReference: string,
    entityManager?: EntityManager,
  ) {
   return await this.tripRepository.confirmBookingPayment(bookingId, paymentReference, entityManager);
  }

  // ─── Passenger: Cancel booking ────────────────────────────────────────────

  async cancelBooking(id: string, dto: CancelBookingDto, entityManager?: EntityManager) {
      return await this.tripRepository.cancelBooking(id, dto, entityManager);
  }

  // ─── Get my bookings (passenger) ─────────────────────────────────────────

  async getMyBookings(id: string, query: TripListQueryDto) {
   return await this.tripRepository.getMyBookings(id, query)
  }

  // ─── Get my trips (driver) ────────────────────────────────────────────────

  async getMyTrips(id: string, query: TripListQueryDto) {
   return await this.tripRepository.getMyTrips(id, query);
  }

  // ─── Get trip bookings (driver) ───────────────────────────────────────────

  async getTripBookings(id: string, tripId: string) {
    return await  this.tripRepository.getTripBookings(id, tripId);
  }

  // ─── Driver: Check-in passenger ──────────────────────────────────────────

  async checkInPassenger(id: string, bookingId: string) {
    return await this.tripRepository.checkInPassenger(id, bookingId);
  }

  // ─── Get booking detail ───────────────────────────────────────────────────

  async getBookingByCode( id: string, bookingCode: string,) {
    return await this.tripRepository.getBookingByCode( id, bookingCode,)
  }

 

  async getBoardingQr(userId: string, bookingCode: string): Promise<{ svg: string; payload: string }> {
  // reuse your ownership-checked fetch
  const booking = await this.tripRepository.getBookingByCode( userId, bookingCode,);

  if (booking.ticketStatus !== TicketStatus.ISSUED) {
    throw new ForbiddenException('Ticket is not available for boarding (unpaid, scanned, or void)');
  }
  if (!booking.ticketToken) {
    throw new NotFoundException('No ticket issued for this booking');
  }

  // The driver's scanner reads this JSON; the scan endpoint re-validates the token.
  const payload = JSON.stringify({
    bookingCode: booking.bookingCode,
    ticketToken: booking.ticketToken,
  });

  const svg = await QRCode.toString(payload, { type: 'svg', width: 300, margin: 1 });
  return { svg, payload };
}



  
}