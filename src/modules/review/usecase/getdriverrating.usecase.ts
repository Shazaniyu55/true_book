import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ReviewService } from '../service/review.service';

@Injectable()
export class GetDriverRatingSummaryUsecase extends Usecase {
  constructor(private readonly reviewService: ReviewService) {
    super();
  }
 
  async execute(_entityManager: EntityManager, args: { driverId: string }) {
    return this.reviewService.getDriverRatingSummary(args.driverId);
  }
}