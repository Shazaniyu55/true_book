import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripsService } from '../service/trip.service';
import { BookTripDto } from '../dtos/trip.dto';

@Injectable()
export class BookTripUsecase extends Usecase {
  constructor(private readonly tripserviceService: TripsService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { id: string, dto:BookTripDto }) {
    return this.tripserviceService.bookTrip(args.id, args.dto);
  }
}