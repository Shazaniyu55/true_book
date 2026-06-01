import {

  Injectable,
} from '@nestjs/common';
import {  EntityManager } from 'typeorm';

import { Trip } from '@modules/core/entities/trip.entity';
import { Driver } from '@modules/core/entities/driver.entity';
import { Passenger } from '@modules/core/entities/passenger.entity';


import {
  BookTripDto,
  CancelBookingDto,
  CancelTripDto,
  CompleteTripDto,
  CreateTripDto,
  SearchTripsDto,
  UpdateTripDto,
} from '../dtos/trip.dto';
import { TripRepository } from '@adapters/repositories/trip.repository';



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

  async getMyBookings(id: string, query: { page?: number; limit?: number; status?: string }) {
   return await this.tripRepository.getMyBookings(id, {...query})
  }

  // ─── Get my trips (driver) ────────────────────────────────────────────────

  async getMyTrips(id: string, query: { page?: number; limit?: number; status?: string }) {
   return await this.tripRepository.getMyTrips(id, {...query});
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

  async getBookingByCode(bookingCode: string, id: string) {
    return await this.tripRepository.getBookingByCode(bookingCode, id)
  }

 

  



  
}