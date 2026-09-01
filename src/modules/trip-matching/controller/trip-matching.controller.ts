import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { AdminOnly, DriverOnly } from '@shared/decorators/roles.decorator';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { ServiceName } from '@shared/decorators/servicename.decorators';
import { Broker } from '@broker/broker';

import { BoardQueryDto, ClaimPoolDto } from '../dtos/trip-matching.dto';
import { GetDriverBoardUsecase } from '../usecases/getdriverboard.usecase';
import { ClaimPoolUsecase } from '../usecases/claimpool.usecase';
import { RunMatchingUsecase } from '../usecases/runmatching.usecase';

@ApiTags('Trip Request Board')
@ApiBearerAuth()
@ServiceName('trip-request-board')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/trip-requests/board')
export class TripMatchingController {
  constructor(
    private readonly broker: Broker,
    private readonly getDriverBoardUsecase: GetDriverBoardUsecase,
    private readonly claimPoolUsecase: ClaimPoolUsecase,
    private readonly runMatchingUsecase: RunMatchingUsecase,
  ) {}

  @DriverOnly()
  @Get('get-board')
  @ApiOperation({
    summary: 'Driver: Trip request board',
    description:
      'Pooled passenger requests that are due (12h before departure for intra-state trips, ' +
      '18h for inter-state). Filter by ?state= or ?scope=intra|inter.',
  })
  getBoard(@Query() query: BoardQueryDto) {
    return this.broker.runUsecases([this.getDriverBoardUsecase], { query });
  }

  @DriverOnly()
  @Post(':poolId/claim')
  @ApiOperation({
    summary: 'Driver: Claim a pooled trip request',
    description:
      'Claims the pool for this driver and notifies every passenger in it. ' +
      'Optionally attach a trip you already created that will serve them.',
  })
  @ApiParam({ name: 'poolId', description: 'Trip request pool ID' })
  claim(
    @AuthUser() user: any,
    @Param('poolId') poolId: string,
    @Body() dto: ClaimPoolDto,
  ) {
    return this.broker.runUsecases([this.claimPoolUsecase], {
      driverUserId: user.sub,
      poolId,
      dto,
    });
  }

  @AdminOnly()
  @Post('run-matching')
  @ApiOperation({
    summary: 'Admin: Run the matching + dispatch sweep now',
    description:
      'Groups pending requests into pools and dispatches any that are inside their ' +
      'board window. Runs automatically on a schedule; this is a manual trigger.',
  })
  runMatching() {
    return this.broker.runUsecases([this.runMatchingUsecase], {});
  }
}
