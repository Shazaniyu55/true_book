import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TripMatchingService } from '../service/trip-matching.service';

/**
 * Admin/manual trigger: run the matching sweep and dispatch any pools that are
 * already inside their board window. Handy for testing and back-office control;
 * the same steps also run automatically on a cron.
 */
@Injectable()
export class RunMatchingUsecase extends Usecase {
  constructor(private readonly matching: TripMatchingService) {
    super();
  }

  async execute(_em: EntityManager) {
    const matched = await this.matching.matchPendingRequests();
    const dispatched = await this.matching.dispatchDuePools();
    return { ...matched, ...dispatched };
  }
}
