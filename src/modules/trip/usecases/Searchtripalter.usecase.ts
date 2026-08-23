import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripsService } from '../service/trip.service';
import { SearchTripsDto } from '../dtos/trip.dto';

@Injectable()
export class SearchTripAlterUsecase extends Usecase {
  constructor(private readonly tripService: TripsService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: SearchTripsDto) {
    // Now returns the normal paged result PLUS { exactDateAvailable,
    // alternatives, canRequestTrip } so the app can offer nearby dates or a
    // "Request a trip" button when a dated search finds nothing.
    return this.tripService.searchTripsWithAlternatives(args);
  }
}