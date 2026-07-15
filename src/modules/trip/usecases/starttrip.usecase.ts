import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripsService } from '../service/trip.service';

@Injectable()
export class StartTripUsecase extends Usecase {
  constructor(private readonly tripserviceService: TripsService) { super(); }
  async execute(em: EntityManager, args: { id: string; tripId: string }) {
    return this.tripserviceService.startTrip(args.id, args.tripId, em);
  }
}
