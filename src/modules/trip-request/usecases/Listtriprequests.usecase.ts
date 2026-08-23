import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripRequestService } from '../service/trip-request.service';
import { TripRequestListQueryDto } from '../dtos/trip-request.dto';

@Injectable()
export class ListTripRequestsUsecase extends Usecase {
  constructor(private readonly service: TripRequestService) {
    super();
  }

  async execute(_em: EntityManager, args: TripRequestListQueryDto) {
    return this.service.listRequests(args ?? {});
  }
}