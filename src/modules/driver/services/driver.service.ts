import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { Trip } from '@modules/core/entities/trip.entity';
import { CreateDriverTripDto, UpdateDriverTripDto, CancelDriverTripDto, CompleteDriverTripDto } from '../dtos/create-driver.dto';
import {
  CreateDriverTripUseCase,
  UpdateDriverTripUseCase,
  ActivateDriverTripUseCase,
  CancelDriverTripUseCase,
  CompleteDriverTripUseCase,
} from '../usecases/driver.usecases';
import { instanceToPlain } from 'class-transformer';

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
    private readonly createTripUseCase: CreateDriverTripUseCase,
    private readonly updateTripUseCase: UpdateDriverTripUseCase,
    private readonly activateTripUseCase: ActivateDriverTripUseCase,
    private readonly cancelTripUseCase: CancelDriverTripUseCase,
    private readonly completeTripUseCase: CompleteDriverTripUseCase,
  ) {}

  /**
   * Create a new trip
   */
  async createTrip(userId: string, dto: CreateDriverTripDto, em?: EntityManager) {
    this.logger.debug(`Creating trip for driver ${userId}`);
    const trip = this.createTripUseCase.execute(userId, dto, em);
    return instanceToPlain(trip)
  }

  /**
   * Update trip details (only PENDING trips)
   */
  async updateTrip(userId: string, tripId: string, dto: UpdateDriverTripDto, em?: EntityManager): Promise<Trip> {
    this.logger.debug(`Updating trip ${tripId} for driver ${userId}`);
    return this.updateTripUseCase.execute(userId, tripId, dto, em);
  }

  /**
   * Activate trip (publish for bookings)
   */
  async activateTrip(userId: string, tripId: string, em?: EntityManager): Promise<Trip> {
    this.logger.debug(`Activating trip ${tripId} for driver ${userId}`);
    return this.activateTripUseCase.execute(userId, tripId, em);
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
    return this.cancelTripUseCase.execute(userId, tripId, dto, em);
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
    return this.completeTripUseCase.execute(userId, tripId, dto, em);
  }
}