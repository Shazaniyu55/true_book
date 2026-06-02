import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripsService } from '../service/trip.service';
import { CreateTripDto } from '../dtos/trip.dto';

@Injectable()
export class CreateTripUsecase extends Usecase {
  constructor(private readonly tripserviceService: TripsService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { id: string, dto:CreateTripDto }) {
    return this.tripserviceService.createTrip(args.id, args.dto, _entityManager);
  }
}