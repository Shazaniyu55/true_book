import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Review } from '@modules/core/entities/review.entity';
import { Booking } from '@modules/core/entities/booking.entity';
import { Passenger } from '@modules/core/entities/passenger.entity';
import { Driver } from '@modules/core/entities/driver.entity';

import { Broker } from '@broker/broker';
import { ReviewService } from './service/review.service';
import { CreateReviewUsecase } from './usecase/createreview.usecase';
import { GetDriverRatingSummaryUsecase } from './usecase/getdriverrating.usecase';
import { GetDriverReviewsUsecase } from './usecase/getdriverreview.usecase';
import { GetMyReviewsUsecase } from './usecase/getmyreview.usecase';
import { ReviewController } from './controller/review.controller';



@Module({
  imports: [TypeOrmModule.forFeature([Review, Booking, Passenger, Driver])],
  controllers: [ReviewController],
  providers: [
    Broker,
    ReviewService,
    CreateReviewUsecase,
    GetDriverReviewsUsecase,
    GetDriverRatingSummaryUsecase,
    GetMyReviewsUsecase,
  ],
  exports: [ReviewService],
})
export class ReviewModule {}