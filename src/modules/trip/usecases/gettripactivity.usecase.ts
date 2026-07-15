import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripsService } from '../service/trip.service';

@Injectable()
export class GetTripActivityUsecase extends Usecase {
  constructor(private readonly tripserviceService: TripsService) { super(); }
  async execute(_em: EntityManager, args: { id: string }) {
    return this.tripserviceService.getTripActivity(args.id);
  }
}
