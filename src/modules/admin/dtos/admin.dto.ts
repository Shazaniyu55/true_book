import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
} from 'class-validator';
import { CouponType, DocumentStatus } from '../../../types/enums';
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

export class UpdateAdminProfileDto {
  @ApiPropertyOptional({ example: 'Emeka' })
  @IsOptional() @IsString() firstName?: string;

  @ApiPropertyOptional({ example: 'Okafor' })
  @IsOptional() @IsString() lastName?: string;

    @ApiPropertyOptional({ example: 'Okafor Emeka' })
  @IsOptional() @IsString() fullName?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional() @IsString() phone?: string;

  @ApiPropertyOptional({ description: 'Profile photo URL (after Cloudinary upload)' })
  @IsOptional() @IsString() profilePhoto?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional() @IsString() state?: string;
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


export class UpdateDriverDocumentDto {
  @IsString()
  @IsOptional()
  documentType?: string;

  @IsString()
  @IsOptional()
  documentUrl?: string;

  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  // require a reason when (and only when) the doc is being rejected
  @ValidateIf((o) => o.status === DocumentStatus.REJECTED)
  @IsString()
  @IsNotEmpty({ message: 'rejectionReason is required when status is REJECTED' })
  rejectionReason?: string;

  @IsObject()
  @IsOptional()
  verificationData?: Record<string, any>;
}