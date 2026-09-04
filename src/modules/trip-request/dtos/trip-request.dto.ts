import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TripRequestStatus, PREFERRED_TIME_RANGES } from '../../../types/enums';
// ─── Passenger creates a trip request ──────────────────────────────────────

export class CreateTripRequestDto {
  @ApiProperty({ example: 'Abuja' })
  @IsNotEmpty() @IsString() origin: string;

  @ApiProperty({ example: 'Lagos' })
  @IsNotEmpty() @IsString() destination: string;

  @ApiProperty({ example: '2025-08-25', description: 'Wanted date. DD-MM-YYYY or YYYY-MM-DD.' })
  @IsNotEmpty() @IsString() date: string;

  @ApiPropertyOptional({ example: 2, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) seats?: number;

@ApiPropertyOptional({
    enum: PREFERRED_TIME_RANGES,
    example: '7:00 AM - 9:00 AM',
    description:
      'Preferred departure window. One of: "7:00 AM - 9:00 AM", ' +
      '"12:00 PM - 2:00 PM", "5:00 PM - 7:00 PM". Used to group you with other ' +
      'passengers on the same route/date and to schedule when drivers are notified.',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim().replace(/\s+/g, ' ').toUpperCase()
      : value,
  )
  @IsIn(PREFERRED_TIME_RANGES, {
    message:
      'preferredTime must be one of: 7:00 AM - 9:00 AM, 12:00 PM - 2:00 PM, 5:00 PM - 7:00 PM',
  })
  preferredTime?: string;

  @ApiPropertyOptional({ example: 'Prefer a morning departure if possible.' })
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

// ─── Admin list / filter ───────────────────────────────────────────────────

export class TripRequestListQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;

  @ApiPropertyOptional({
    enum: TripRequestStatus,
    isArray: true,
    description:
      'Filter by one or more statuses. Accepts a single value ' +
      '(?status=approved), a comma-separated list ' +
      '(?status=approved,fulfilled), or repeated params. Omit to list all.',
  })
  @IsOptional()
  @Transform(({ value }) =>
    (Array.isArray(value) ? value : String(value).split(','))
      .map((v) => v.trim())
      .filter(Boolean),
  )
  @IsEnum(TripRequestStatus, { each: true })
  status?: TripRequestStatus[];

  @ApiPropertyOptional({ description: 'Search by origin, destination or requester note' })
  @IsOptional() @IsString() search?: string;
}

// ─── Admin approves ────────────────────────────────────────────────────────

export class ApproveTripRequestDto {
  @ApiPropertyOptional({
    description: 'Optional trip to attach to this request. Recorded on linkedTripId.',
  })
  @IsOptional() @IsString() tripId?: string;

  @ApiPropertyOptional({ example: 'Trip added for the 26th — check the app.' })
  @IsOptional() @IsString() @MaxLength(500) adminNote?: string;
}

// ─── Admin declines ────────────────────────────────────────────────────────

export class DeclineTripRequestDto {
  @ApiProperty({ example: 'No driver available on that route yet.' })
  @IsNotEmpty() @IsString() @MaxLength(500) reason: string;
}

// import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
// import {
//   IsEnum,
//   IsInt,
//   IsNotEmpty,
//   IsOptional,
//   IsString,
//   Min,
//   MaxLength,
// } from 'class-validator';
// import { Transform, Type } from 'class-transformer';
// import { TripRequestStatus } from '../../../types/enums';

// // ─── Passenger creates a trip request ──────────────────────────────────────

// export class CreateTripRequestDto {
//   @ApiProperty({ example: 'Abuja' })
//   @IsNotEmpty() @IsString() origin: string;

//   @ApiProperty({ example: 'Lagos' })
//   @IsNotEmpty() @IsString() destination: string;

//   @ApiProperty({ example: '2025-08-25', description: 'Wanted date. DD-MM-YYYY or YYYY-MM-DD.' })
//   @IsNotEmpty() @IsString() date: string;

//   @ApiPropertyOptional({ example: 2, default: 1 })
//   @IsOptional() @Type(() => Number) @IsInt() @Min(1) seats?: number;

//   @ApiPropertyOptional({ example: 'Prefer a morning departure if possible.' })
//   @IsOptional() @IsString() @MaxLength(500) note?: string;
// }

// // ─── Admin list / filter ───────────────────────────────────────────────────

// export class TripRequestListQueryDto {
//   @ApiPropertyOptional({ example: 1, default: 1 })
//   @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;

//   @ApiPropertyOptional({ example: 20, default: 20 })
//   @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;

//   @ApiPropertyOptional({
//     enum: TripRequestStatus,
//     isArray: true,
//     description:
//       'Filter by one or more statuses. Accepts a single value ' +
//       '(?status=approved), a comma-separated list ' +
//       '(?status=approved,fulfilled), or repeated params. Omit to list all.',
//   })
//   @IsOptional()
//   @Transform(({ value }) =>
//     (Array.isArray(value) ? value : String(value).split(','))
//       .map((v) => v.trim())
//       .filter(Boolean),
//   )
//   @IsEnum(TripRequestStatus, { each: true })
//   status?: TripRequestStatus[];

//   @ApiPropertyOptional({ description: 'Search by origin, destination or requester note' })
//   @IsOptional() @IsString() search?: string;
// }

// // ─── Admin approves ────────────────────────────────────────────────────────

// export class ApproveTripRequestDto {
//   @ApiPropertyOptional({
//     description: 'Optional trip to attach to this request. Recorded on linkedTripId.',
//   })
//   @IsOptional() @IsString() tripId?: string;

//   @ApiPropertyOptional({ example: 'Trip added for the 26th — check the app.' })
//   @IsOptional() @IsString() @MaxLength(500) adminNote?: string;
// }

// // ─── Admin declines ────────────────────────────────────────────────────────

// export class DeclineTripRequestDto {
//   @ApiProperty({ example: 'No driver available on that route yet.' })
//   @IsNotEmpty() @IsString() @MaxLength(500) reason: string;
// }