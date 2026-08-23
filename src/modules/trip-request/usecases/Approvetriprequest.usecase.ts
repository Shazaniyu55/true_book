import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripRequestService } from '../service/trip-request.service';
import { ApproveTripRequestDto } from '../dtos/trip-request.dto';

@Injectable()
export class ApproveTripRequestUsecase extends Usecase {
  constructor(private readonly service: TripRequestService) {
    super();
  }

  async execute(
    em: EntityManager,
    args: { adminId: string; requestId: string; dto: ApproveTripRequestDto },
  ) {
    return this.service.approveRequest(args.adminId, args.requestId, args.dto ?? {}, em);
  }
}