import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { AdminOnly, PassengerOnly } from '@shared/decorators/roles.decorator';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { ReferralService } from '../service/referal.service';
import { UpdateReferralConfigDto } from '../dtos/cupon.dto';

@ApiTags('Referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/referrals')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  // ─── Passenger ────────────────────────────────────────────────────────────

  /**
   * Returns the passenger's referral stats:
   * total referred, qualified count, progress to next reward, reward value.
   */
  @PassengerOnly()
  @Get('stats')
  @ApiOperation({
    summary: 'Passenger: My referral statistics',
    description:
      'Shows total referrals made, how many qualified (first booking completed), ' +
      'progress toward the next reward milestone, and the reward value.',
  })
  getStats(@AuthUser() user: any) {
    return this.referralService.getReferralStats(user.sub);
  }

  /**
   * Paginated list of people the passenger referred.
   */
  @PassengerOnly()
  @Get('list')
  @ApiOperation({ summary: 'Passenger: List my referrals' })
  listReferrals(
    @AuthUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.referralService.getReferralList(user.sub, { page, limit });
  }

  @PassengerOnly()
  @Get('coupons')
  @ApiOperation({ summary: 'List the passenger\'s referral reward coupons' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: ['all', 'used', 'expired'] })
  async getCoupons(
    @AuthUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: 'all' | 'used' | 'expired',
  ) {
    return this.referralService.getReferralCuponType(user.sub, { page, limit, type });
  }
  // ─── Admin ────────────────────────────────────────────────────────────────

  /**
   * View the current referral reward configuration.
   */
  @AdminOnly()
  @Get('config')
  @ApiOperation({
    summary: 'Admin: Get referral reward configuration',
    description:
      'Returns the current milestone settings (referralsRequired, rewardValue, etc.)',
  })
  getConfig() {
    return this.referralService.getConfig();
  }

  /**
   * Update the referral reward configuration.
   * E.g. change milestone from 5 to 10, or change reward from NGN 500 flat to 10%.
   */
  @AdminOnly()
  @Patch('config')
  @ApiOperation({
    summary: 'Admin: Update referral reward configuration',
    description:
      'Adjust milestones, reward type (flat/percentage), reward value, and coupon validity.',
  })
  updateConfig(@Body() dto: UpdateReferralConfigDto) {
    return this.referralService.updateConfig(dto);
  }
}