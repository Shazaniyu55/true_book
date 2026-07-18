import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripsService } from '../service/trip.service';

@Injectable()
export class GetCancellationReasonsUsecase extends Usecase {
  constructor(private readonly tripsService: TripsService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { audience?: string }) {
    return this.tripsService.getCancellationReasons(args.audience);
  }
}