import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripsService } from '../service/trip.service';
import { CompleteTripDto } from '../dtos/trip.dto';

@Injectable()
export class CompleteTripUsecase extends Usecase {
  constructor(private readonly tripserviceService: TripsService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { id: string, dto:CompleteTripDto }) {
    return this.tripserviceService.completeTrip(args.id, args.dto, );
  }
}