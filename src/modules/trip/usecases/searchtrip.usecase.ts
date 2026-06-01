import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripsService } from '../service/trip.service';
import { SearchTripsDto } from '../dtos/trip.dto';

@Injectable()
export class SearchTripUsecase extends Usecase {
  constructor(private readonly tripService: TripsService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: SearchTripsDto) {
    return this.tripService.searchTrips(args);
  }
}