import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripsService } from '../service/trip.service';
import { UpdateTripDto } from '../dtos/trip.dto';

@Injectable()
export class UpdateTripUsecase extends Usecase {
  constructor(private readonly passengerService: TripsService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { id: string, tripId:string, dto:UpdateTripDto }) {
    return this.passengerService.updateTrip(args.id, args.tripId, args.dto);
  }
}