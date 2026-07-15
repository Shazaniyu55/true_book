import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripsService } from '../service/trip.service';
import { VerifyBookingDto } from '../dtos/trip.dto';

@Injectable()
export class VerifyBookingUsecase extends Usecase {
  constructor(private readonly tripserviceService: TripsService) { super(); }
  async execute(em: EntityManager, args: { id: string; dto: VerifyBookingDto }) {
    return this.tripserviceService.verifyBookingByCode(args.id, args.dto.bookingCode, em);
  }
}
