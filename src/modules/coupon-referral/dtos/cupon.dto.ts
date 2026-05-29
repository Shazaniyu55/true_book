import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CouponType } from '../../../types/enums';

// ─── Admin: Create coupon ─────────────────────────────────────────────────────

export class CreateCouponDto {
  @ApiProperty({ example: 'SUMMER20', description: 'Unique coupon code' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ enum: CouponType, example: CouponType.PERCENTAGE })
  @IsEnum(CouponType)
  type: CouponType;

  @ApiProperty({ example: 20, description: 'Flat NGN or percentage value' })
  @IsPositive()
  @IsNumber()
  value: number;

  @ApiPropertyOptional({ example: 2000, description: 'Max NGN discount (for percentage coupons)' })
  @IsOptional()
  @IsPositive()
  @IsNumber()
  maxDiscount?: number;

  @ApiPropertyOptional({ example: 1000, description: 'Minimum order amount in NGN' })
  @IsOptional()
  @IsPositive()
  @IsNumber()
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 100, description: 'Max number of times coupon can be used' })
  @IsOptional()
  @IsPositive()
  @IsNumber()
  usageLimit?: number;

  @ApiPropertyOptional({
    example: '2025-12-31T23:59:59Z',
    description: 'ISO date when the coupon expires',
  })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @ApiPropertyOptional({
    example: '2025-06-01T00:00:00Z',
    description: 'ISO date when the coupon becomes valid (defaults to now)',
  })
  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @ApiPropertyOptional({ example: 'Summer sale discount' })
  @IsOptional()
  @IsString()
  description?: string;
}

// ─── Admin: Update coupon ────────────────────────────────────────────────────

export class UpdateCouponDto {
  @ApiPropertyOptional({ example: 'NEWYEAR30' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ enum: CouponType })
  @IsOptional()
  @IsEnum(CouponType)
  type?: CouponType;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsPositive()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPositive()
  @IsNumber()
  maxDiscount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPositive()
  @IsNumber()
  minOrderAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPositive()
  @IsNumber()
  usageLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

// ─── Admin: Toggle welcome coupon ────────────────────────────────────────────

export class ToggleWelcomeCouponDto {
  @ApiProperty({
    example: true,
    description:
      'true = activate welcome coupon (send to new registrants), false = deactivate',
  })
  @IsBoolean()
  activate: boolean;

  @ApiPropertyOptional({
    example: 'WELCOME2025',
    description: 'Coupon code (auto-generated if omitted)',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ enum: CouponType, default: CouponType.PERCENTAGE })
  @IsOptional()
  @IsEnum(CouponType)
  type?: CouponType;

  @ApiPropertyOptional({
    example: 15,
    description: 'Discount value (% or flat NGN)',
    default: 10,
  })
  @IsOptional()
  @IsPositive()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({ example: 3000, description: 'Max NGN discount cap' })
  @IsOptional()
  @IsPositive()
  @IsNumber()
  maxDiscount?: number;

  @ApiPropertyOptional({ example: 500, description: 'Min order amount to use coupon' })
  @IsOptional()
  @IsPositive()
  @IsNumber()
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59Z' })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @ApiPropertyOptional({ example: 'Welcome aboard! Enjoy 15% off your first trip' })
  @IsOptional()
  @IsString()
  description?: string;
}

// ─── Passenger: Validate coupon before booking ───────────────────────────────

export class ValidateCouponDto {
  @ApiProperty({ example: 'SUMMER20' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ example: 7500, description: 'Booking subtotal in NGN (before discount)' })
  @IsPositive()
  @IsNumber()
  subtotal: number;
}

// ─── Admin: Referral config ───────────────────────────────────────────────────

export class UpdateReferralConfigDto {
  @ApiPropertyOptional({
    example: 5,
    description: 'Number of successful referrals needed to earn a reward',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  referralsRequired?: number;

  @ApiPropertyOptional({
    example: 'flat',
    enum: ['flat', 'percentage'],
    description: 'Reward type',
  })
  @IsOptional()
  @IsString()
  rewardType?: 'flat' | 'percentage';

  @ApiPropertyOptional({ example: 500, description: 'Reward value (NGN or %)' })
  @IsOptional()
  @IsPositive()
  @IsNumber()
  rewardValue?: number;

  @ApiPropertyOptional({ example: 2000, description: 'Max discount cap for percentage rewards' })
  @IsOptional()
  @IsPositive()
  @IsNumber()
  maxDiscount?: number;

  @ApiPropertyOptional({ example: 30, description: 'Days the reward coupon is valid for' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  couponValidityDays?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

// ─── Query ───────────────────────────────────────────────────────────────────

export class CouponListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ enum: CouponType })
  @IsOptional()
  @IsEnum(CouponType)
  type?: CouponType;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}