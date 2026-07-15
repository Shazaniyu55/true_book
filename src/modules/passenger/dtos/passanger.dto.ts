import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsObject, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';
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



    @ApiProperty({ example: '1999-06-05' })
@IsOptional()
@IsDateString()
dob?: string;

  @ApiProperty({ example: 'Abuja' })
  @IsString()
  @IsOptional()
  city: string;

  @ApiProperty({ example: 'Abuja 4 wuse' })
  @IsString()
  @IsOptional()
  address: string;

  @ApiProperty({ example: 'male' })
  @IsString()
  @IsOptional()
  gender: string;

  @ApiProperty({ example: 'Nigeria' })
  @IsString()
  @IsOptional()
  country: string;
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