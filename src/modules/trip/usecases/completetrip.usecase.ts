import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripsService } from '../service/trip.service';

@Injectable()
export class CompleteTripUsecase extends Usecase {
  constructor(private readonly passengerService: TripsService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { id: string, tripId:string }) {
    return this.passengerService.activateTrip(args.id, args.tripId);
  }
}