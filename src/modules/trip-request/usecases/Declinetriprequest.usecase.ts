import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripRequestService } from '../service/trip-request.service';
import { DeclineTripRequestDto } from '../dtos/trip-request.dto';

@Injectable()
export class DeclineTripRequestUsecase extends Usecase {
  constructor(private readonly service: TripRequestService) {
    super();
  }

  async execute(
    em: EntityManager,
    args: { adminId: string; requestId: string; dto: DeclineTripRequestDto },
  ) {
    return this.service.declineRequest(args.adminId, args.requestId, args.dto, em);
  }
}