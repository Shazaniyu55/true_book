import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripsService } from '../service/trip.service';

@Injectable()
export class GetBoardingQrUsecase extends Usecase {
  constructor(private readonly tripService: TripsService) { super(); }
  async execute(_em: EntityManager, args: { id: string; bookingCode: string }) {
    return this.tripService.getBoardingQr(args.id, args.bookingCode);
  }
}