import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TripStatus, VehicleType } from '../../../types/enums';

// ─── Driver creates a trip ─────────────────────────────────────────────────

export class CreateTripDto {
  @ApiProperty({ example: 'Lagos (CMS)' })
  @IsNotEmpty() @IsString() origin: string;

  @ApiProperty({ example: 'Abuja (Wuse)' })
  @IsNotEmpty() @IsString() destination: string;

  @ApiProperty({ example: '2025-08-15T07:00:00.000Z' })
  @IsNotEmpty() @IsDateString() departureTime: string;

  @ApiPropertyOptional({ example: '2025-08-15T15:00:00.000Z' })
  @IsOptional() @IsDateString() arrivalTime?: string;

  @ApiProperty({ example: 14, description: 'Total seats available' })
  @IsPositive() @Min(1) @IsNumber() totalSeats: number;

  @ApiProperty({ example: 7500, description: 'Price per seat in NGN' })
  @IsPositive() @IsNumber() pricePerSeat: number;

  @ApiPropertyOptional({ description: 'Vehicle ID (must belong to driver)' })
  @IsOptional() @IsNumber() vehicleId?: number;

  @ApiPropertyOptional({
    description: 'Intermediate stops',
    example: [{ city: 'Ore', coordinates: { lat: 6.74, lng: 4.86 } }],
  })
  @IsOptional() @IsArray() waypoints?: any[];

  @ApiPropertyOptional()
  @IsOptional() metadata?: Record<string, any>;
}

// ─── Update trip ───────────────────────────────────────────────────────────

export class UpdateTripDto {
  @ApiPropertyOptional() @IsOptional() @IsString() origin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() destination?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() departureTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() arrivalTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsPositive() @IsNumber() totalSeats?: number;
  @ApiPropertyOptional() @IsOptional() @IsPositive() @IsNumber() pricePerSeat?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() vehicleId?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() waypoints?: any[];
}

// ─── Passenger books a trip ────────────────────────────────────────────────

export class BookTripDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty() @IsNumber() tripId: number;

  @ApiProperty({ example: 2, description: 'Number of seats to book' })
  @IsPositive() @Min(1) @IsNumber() seats: number;

  @ApiPropertyOptional({ description: 'Discount coupon code' })
  @IsOptional() @IsString() couponCode?: string;

  @ApiPropertyOptional({ description: 'Payment redirect URL after Paystack checkout' })
  @IsOptional() callbackUrl?: string;
}

// ─── Trip search / filter ──────────────────────────────────────────────────

export class SearchTripsDto {
  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional() @IsString() origin?: string;

  @ApiPropertyOptional({ example: 'Abuja' })
  @IsOptional() @IsString() destination?: string;

  @ApiPropertyOptional({ example: '2025-08-15' })
  @IsOptional() @IsString() date?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) seats?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsNumber() page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional() @Type(() => Number) @IsNumber() limit?: number;

  @ApiPropertyOptional({ enum: TripStatus })
  @IsOptional() @IsEnum(TripStatus) status?: TripStatus;

  @ApiPropertyOptional({ description: 'Max price per seat' })
  @IsOptional() @Type(() => Number) @IsNumber() maxPrice?: number;

  @ApiPropertyOptional({ description: 'Sort by price | departure | seats' })
  @IsOptional() @IsString() sortBy?: 'price' | 'departure' | 'seats';
}

// ─── Cancel booking ────────────────────────────────────────────────────────

export class CancelBookingDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty() @IsNumber() bookingId: number;

  @ApiPropertyOptional({ example: 'Change of plans' })
  @IsOptional() @IsString() reason?: string;
}

// ─── Driver completes trip ─────────────────────────────────────────────────

export class CompleteTripDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty() @IsNumber() tripId: number;

  @ApiPropertyOptional({ example: 'Trip completed successfully' })
  @IsOptional() @IsString() notes?: string;
}

// ─── Driver cancels trip ───────────────────────────────────────────────────

export class CancelTripDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty() @IsNumber() tripId: number;

  @ApiProperty({ example: 'Vehicle breakdown' })
  @IsNotEmpty() @IsString() reason: string;
}