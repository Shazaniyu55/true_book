import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ReviewService } from '../service/review.service';
import { ReviewListQueryDto } from '../dto/review.dto';

@Injectable()
export class GetDriverReviewsUsecase extends Usecase {
  constructor(private readonly reviewService: ReviewService) {
    super();
  }
 
  async execute(_entityManager: EntityManager, args: { driverId: string } & ReviewListQueryDto) {
    const { driverId, ...query } = args;
    return this.reviewService.getDriverReviews(driverId, query);
  }
}