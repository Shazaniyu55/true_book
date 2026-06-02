import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripsService } from '../service/trip.service';

@Injectable()
export class CheckInPassengerUsecase extends Usecase {
  constructor(private readonly tripserviceService: TripsService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { id: string, bookingId: string }) {
    return this.tripserviceService.checkInPassenger(args.id, args.bookingId);
  }
}