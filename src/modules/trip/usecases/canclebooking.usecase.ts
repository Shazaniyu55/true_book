import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripsService } from '../service/trip.service';
import { CancelBookingDto, CancelTripDto } from '../dtos/trip.dto';

@Injectable()
export class CancleBookingUsecase extends Usecase {
  constructor(private readonly tripserviceService: TripsService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { id: string, dto: CancelBookingDto, }) {
    return this.tripserviceService.cancelBooking(args.id, args.dto, _entityManager);
  }
}