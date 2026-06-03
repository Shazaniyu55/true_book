import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import { AdminOnly, PassengerOnly } from '@shared/decorators/roles.decorator';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { CouponService } from '../service/cupon.service';
import {
  CouponListQueryDto,
  CreateCouponDto,
  ToggleWelcomeCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
} from '../dtos/cupon.dto';

@ApiTags('Coupons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/admin/coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  // ─── Admin ────────────────────────────────────────────────────────────────

  @AdminOnly()
  @Post('create')
  @ApiOperation({ summary: 'Admin: Create a new coupon' })
  create(@Body() dto: CreateCouponDto, @AuthUser() user: any) {
    return this.couponService.createCoupon(dto, user.id);
  }

  @AdminOnly()
  @Put(':id/update')
  @ApiOperation({ summary: 'Admin: Update a coupon' })
  @ApiParam({ name: 'id', description: 'Coupon UUID' })
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponService.updateCoupon(id, dto);
  }

  @AdminOnly()
  @Patch(':id/toggle')
  @ApiOperation({
    summary: 'Admin: Toggle coupon active / inactive',
    description: 'Flips the isActive flag. Inactive coupons are silently rejected at checkout.',
  })
  toggle(@Param('id') id: string) {
    return this.couponService.toggleCoupon(id);
  }

  @AdminOnly()
  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Admin: Deactivate a coupon' })
  deactivate(@Param('id') id: string) {
    return this.couponService.deactivateCoupon(id);
  }

  /**
   * Admin toggles the WELCOME coupon on or off.
   *
   * When turned ON with a value/type/expiry, any passenger who registers
   * from that moment until the coupon expires (or is turned off) will receive
   * the coupon code by email.
   */
  @AdminOnly()
  @Post('welcome/toggle')
  @ApiOperation({
    summary: 'Admin: Toggle welcome coupon',
    description:
      'Turn the welcome coupon ON (new registrants receive it by email) or OFF. ' +
      'Only one welcome coupon can be active at a time. ' +
      'Provide type (percentage/fixed), value, and optional expiry.',
  })
  toggleWelcomeCoupon(
    @Body() dto: ToggleWelcomeCouponDto,
    @AuthUser() user: any,
  ) {
    return this.couponService.toggleWelcomeCoupon(dto, user.id);
  }

  @AdminOnly()
  @Get('welcome/active')
  @ApiOperation({ summary: 'Admin: Get the currently active welcome coupon' })
  getActiveWelcomeCoupon() {
    return this.couponService.getActiveWelcomeCoupon();
  }

  @AdminOnly()
  @Get()
  @ApiOperation({ summary: 'Admin: List all coupons with filters' })
  list(@Query() query: CouponListQueryDto) {
    return this.couponService.listCoupons(query);
  }

  @AdminOnly()
  @Get(':id')
  @ApiOperation({ summary: 'Admin: Get coupon by ID' })
  getById(@Param('id') id: string) {
    return this.couponService.getCouponById(id);
  }

  // ─── Passenger ────────────────────────────────────────────────────────────

  /**
   * Passengers can validate a coupon code before submitting a booking.
   * Returns the discount amount and validity status.
   */
  @PassengerOnly()
  @Post('validate')
  @ApiOperation({
    summary: 'Passenger: Validate a coupon code',
    description:
      'Check if a coupon is valid and calculate the discount for a given subtotal. ' +
      'Use this before the booking payment step to show the discount preview.',
  })
  validate(@Body() dto: ValidateCouponDto) {
    return this.couponService.validateCoupon(dto);
  }
}