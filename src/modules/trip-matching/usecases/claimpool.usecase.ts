import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripMatchingService } from '../service/trip-matching.service';
import { ClaimPoolDto } from '../dtos/trip-matching.dto';

@Injectable()
export class ClaimPoolUsecase extends Usecase {
  constructor(private readonly matching: TripMatchingService) {
    super();
  }

  async execute(
    _em: EntityManager,
    args: { driverUserId: string; poolId: string; dto: ClaimPoolDto },
  ) {
    return this.matching.claimPool(args.driverUserId, args.poolId, args.dto);
  }
}
