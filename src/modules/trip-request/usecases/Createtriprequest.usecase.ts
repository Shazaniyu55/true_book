import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripRequestService } from '../service/trip-request.service';
import { CreateTripRequestDto } from '../dtos/trip-request.dto';

@Injectable()
export class CreateTripRequestUsecase extends Usecase {
  constructor(private readonly service: TripRequestService) {
    super();
  }

  async execute(
    em: EntityManager,
    args: { requesterId: string; dto: CreateTripRequestDto },
  ) {
    return this.service.createRequest(args.requesterId, args.dto, em);
  }
}