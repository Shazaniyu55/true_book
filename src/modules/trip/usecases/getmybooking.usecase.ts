import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripsService } from '../service/trip.service';
import { TripListQueryDto } from '../dtos/trip.dto';

@Injectable()
export class GetMyBookingsUsecase extends Usecase {
  constructor(private readonly tripserviceService: TripsService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { id: string, dto:TripListQueryDto }) {
    return this.tripserviceService.getMyBookings(args.id, args.dto);
  }
}