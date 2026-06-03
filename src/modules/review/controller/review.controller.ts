import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { PassengerOnly } from '@shared/decorators/roles.decorator';
import { Public } from '@shared/decorators/isPublic.decorator';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { ServiceName } from '@shared/decorators/servicename.decorators';
import { Broker } from '@broker/broker';

import { CreateReviewDto, ReviewListQueryDto } from '../dto/review.dto';
import { CreateReviewUsecase } from '../usecase/createreview.usecase';
import { GetDriverReviewsUsecase } from '../usecase/getdriverreview.usecase';
import { GetDriverRatingSummaryUsecase } from '../usecase/getdriverrating.usecase';
import { GetMyReviewsUsecase } from '../usecase/getmyreview.usecase';


@ApiTags('Reviews')
@ServiceName('reviews') // For kill switch targeting
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/reviews')
export class ReviewController {
  constructor(
    private readonly broker: Broker,
    private readonly createReviewUsecase: CreateReviewUsecase,
    private readonly getDriverReviewsUsecase: GetDriverReviewsUsecase,
    private readonly getDriverRatingSummaryUsecase: GetDriverRatingSummaryUsecase,
    private readonly getMyReviewsUsecase: GetMyReviewsUsecase,
  ) {}

  // ─── Passenger ──────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @PassengerOnly()
  @Post()
  @ApiOperation({
    summary: 'Passenger: Review a driver after a completed trip',
    description: 'Only the passenger who made the booking can review, and only once per booking.',
  })
  createReview(@AuthUser() user: any, @Body() dto: CreateReviewDto) {
    return this.broker.runUsecases([this.createReviewUsecase], { id: user.sub, dto });
  }

  @ApiBearerAuth()
  @PassengerOnly()
  @Get('mine')
  @ApiOperation({ summary: 'Passenger: List reviews I have written' })
  getMyReviews(@AuthUser() user: any, @Query() query: ReviewListQueryDto) {
    return this.broker.runUsecases([this.getMyReviewsUsecase], { id: user.sub, ...query });
  }

  // ─── Public ───────────────────────────────────────────────────────────────

  @Public()
  @Get('driver/:driverId')
  @ApiOperation({ summary: 'Public: List reviews for a driver' })
  @ApiParam({ name: 'driverId', description: 'Driver UUID' })
  getDriverReviews(@Param('driverId') driverId: string, @Query() query: ReviewListQueryDto) {
    return this.broker.runUsecases([this.getDriverReviewsUsecase], { driverId, ...query });
  }

  @Public()
  @Get('driver/:driverId/summary')
  @ApiOperation({ summary: 'Public: Driver rating summary (average + star breakdown)' })
  @ApiParam({ name: 'driverId', description: 'Driver UUID' })
  getDriverRatingSummary(@Param('driverId') driverId: string) {
    return this.broker.runUsecases([this.getDriverRatingSummaryUsecase], { driverId });
  }
}