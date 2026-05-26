import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { CouponType } from '../../../types/enums';
import { Type } from 'class-transformer';

export class SuspendUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class RejectDocumentDto {
  @ApiProperty() @IsNotEmpty() @IsString() reason: string;
}

export class DeclinePayoutDto {
  @ApiProperty() @IsNotEmpty() @IsString() reason: string;
}

export class CreateCouponDto {
  @ApiProperty({ example: 'WELCOME20' })
  @IsNotEmpty() @IsString() code: string;

  @ApiProperty({ enum: CouponType })
  @IsEnum(CouponType) type: CouponType;

  @ApiProperty({ example: 20, description: 'Flat NGN or percentage depending on type' })
  @IsPositive() @IsNumber() value: number;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional() @IsPositive() @IsNumber() maxDiscount?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional() @IsPositive() @IsNumber() minOrderAmount?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional() @IsPositive() @IsNumber() usageLimit?: number;

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59Z' })
  @IsOptional() @IsISO8601() expiresAt?: string;
}

// export class AdminListQueryDto {
//   @ApiPropertyOptional() @IsOptional() @IsNumber() page?: number;
//   @ApiPropertyOptional() @IsOptional() @IsNumber() limit?: number;
//   @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
//   @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
//   @ApiPropertyOptional() @IsOptional() @IsString() role?: string;
// }

export class AdminListQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;
}

export class CreateAdminDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;
}