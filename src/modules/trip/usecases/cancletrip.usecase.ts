import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripsService } from '../service/trip.service';
import { CancelTripDto } from '../dtos/trip.dto';

@Injectable()
export class CancleTripUsecase extends Usecase {
  constructor(private readonly tripserviceService: TripsService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { id: string, dto:CancelTripDto }) {
    return this.tripserviceService.cancelTrip(args.id, args.dto);
  }
}