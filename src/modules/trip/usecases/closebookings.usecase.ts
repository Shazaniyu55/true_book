import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripsService } from '../service/trip.service';

@Injectable()
export class CloseBookingsUsecase extends Usecase {
  constructor(private readonly tripserviceService: TripsService) { super(); }
  async execute(em: EntityManager, args: { id: string; tripId: string; open: boolean }) {
    return this.tripserviceService.setBookingStatus(args.id, args.tripId, args.open, em);
  }
}
