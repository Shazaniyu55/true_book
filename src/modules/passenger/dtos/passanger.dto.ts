import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePassengerProfileDto {
  @ApiPropertyOptional({ example: 'Emeka' })
  @IsOptional() @IsString() firstName?: string;

  @ApiPropertyOptional({ example: 'Okafor' })
  @IsOptional() @IsString() lastName?: string;

    @ApiPropertyOptional({ example: 'Okafor Emeka' })
  @IsOptional() @IsString() fullName?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional() @IsString() phone?: string;

  @ApiPropertyOptional({ description: 'Profile photo URL (after Cloudinary upload)' })
  @IsOptional() @IsString() profileImage?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional() @IsString() state?: string;
}

export class PassengerQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional() @IsString() status?: string;
}



export class InitiatePaymentDto {
  @ApiProperty({ description: 'Booking (BookTrip) ID to pay for' })
  @IsNotEmpty()
  @IsUUID()
  bookTripId: string;

  @ApiPropertyOptional({ description: 'Billing details captured at checkout' })
  @IsOptional()
  @IsObject()
  billingDetails?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Redirect URL after gateway checkout' })
  @IsOptional()
  @IsUrl()
  callbackUrl?: string;
}