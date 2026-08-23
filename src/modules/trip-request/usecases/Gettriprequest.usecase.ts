import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripRequestService } from '../service/trip-request.service';

@Injectable()
export class GetTripRequestUsecase extends Usecase {
  constructor(private readonly service: TripRequestService) {
    super();
  }

  async execute(_em: EntityManager, args: { requestId: string }) {
    return this.service.getRequestById(args.requestId);
  }
}