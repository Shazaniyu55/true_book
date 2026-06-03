import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ReviewService } from '../service/review.service';
import { CreateReviewDto } from '../dto/review.dto';
 
@Injectable()
export class CreateReviewUsecase extends Usecase {
  constructor(private readonly reviewService: ReviewService) {
    super();
  }
 
  async execute(entityManager: EntityManager, args: { id: string; dto: CreateReviewDto }) {
    return this.reviewService.createReview(args.id, args.dto, entityManager);
  }
}