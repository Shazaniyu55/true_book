import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripsService } from '../service/trip.service';
import { UpdateTripDto } from '../dtos/trip.dto';

@Injectable()
export class UpdateTripUsecase extends Usecase {
  constructor(private readonly tripserviceService: TripsService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { id: string, tripId:string, dto:UpdateTripDto }) {
    return this.tripserviceService.updateTrip(args.id, args.tripId, args.dto);
  }
}