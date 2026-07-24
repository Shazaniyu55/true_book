import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripsService } from '../service/trip.service';

@Injectable()
export class GetTripSummaryByIdUsecase extends Usecase {
  constructor(private readonly tripserviceService: TripsService) { super(); }

  async execute(_em: EntityManager, args: { tripId: string; driverUserId?: string }) {
    return this.tripserviceService.getTripSummaryById(args.tripId, args.driverUserId);
  }
}