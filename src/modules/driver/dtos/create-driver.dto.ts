import { IsString, IsNumber, IsDate, IsOptional, IsEnum, Min, Max, IsNotEmpty, ValidateNested, IsArray, IsDateString } from 'class-validator';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DRIVER TRIP CREATION DTOs
 * ═══════════════════════════════════════════════════════════════════════════
 */

export class CreateDriverTripDto {
  @IsString()
  @IsNotEmpty()
  origin: string;

  @IsString()
  @IsNotEmpty()
  destination: string;

  @IsDateString()
  @IsNotEmpty()
  departureTime: string;

  @IsNumber()
  @Min(1)
  @Max(50)
  totalSeats: number;

  @IsNumber()
  @Min(100)
  pricePerSeat: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  vehicleId?: string;

  @IsString()
  @IsOptional()
  amenities?: string; // JSON string or comma-separated

  @IsOptional()
  @ValidateNested()
 
  metadata?: Record<string, any>;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DRIVER TRIP UPDATE DTOs
 * ═══════════════════════════════════════════════════════════════════════════
 */

export class UpdateDriverTripDto {
  @IsString()
  @IsOptional()
  origin?: string;

  @IsString()
  @IsOptional()
  destination?: string;

  @IsDateString()
  @IsOptional()
  departureTime?: string;

  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  totalSeats?: number;

  @IsNumber()
  @Min(100)
  @IsOptional()
  pricePerSeat?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  amenities?: string;

  @IsOptional()
  @ValidateNested()
  metadata?: Record<string, any>;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DRIVER TRIP CANCELLATION DTOs
 * ═══════════════════════════════════════════════════════════════════════════
 */

export class CancelDriverTripDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  additionalNotes?: string;

  @IsOptional()
  @ValidateNested()
  metadata?: Record<string, any>;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DRIVER TRIP ACTIVATION DTOs
 * ═══════════════════════════════════════════════════════════════════════════
 */

export class ActivateDriverTripDto {
  @IsOptional()
  @ValidateNested()
  metadata?: Record<string, any>;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DRIVER TRIP COMPLETION DTOs
 * ═══════════════════════════════════════════════════════════════════════════
 */

export class CompleteDriverTripDto {
  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsOptional()
  passengerFeedback?: Array<{
    bookingId: number;
    rating: number;
    comment?: string;
  }>;

  @IsOptional()
  @ValidateNested()
  metadata?: Record<string, any>;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * QUERY DTOs
 * ═══════════════════════════════════════════════════════════════════════════
 */

export class GetDriverTripsQueryDto {
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @IsString()
  @IsOptional()
  status?: string; // PENDING, ACTIVE, COMPLETED, CANCELLED

  @IsString()
  @IsOptional()
  sortBy?: 'createdAt' | 'departureTime' | 'totalSeats' | 'pricePerSeat';

  @IsString()
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}

export class GetDriverTripsBookingsQueryDto {
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @IsString()
  @IsOptional()
  status?: string; // PENDING, CONFIRMED, COMPLETED, CANCELLED

  @IsString()
  @IsOptional()
  sortBy?: 'createdAt' | 'passengerName' | 'seats' | 'amountPaid';
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RESPONSE DTOs
 * ═══════════════════════════════════════════════════════════════════════════
 */

export class DriverTripResponseDto {
  id: number;
  reference: string;
  origin: string;
  destination: string;
  departureTime: Date;
  totalSeats: number;
  bookedSeats: number;
  availableSeats: number;
  pricePerSeat: number;
  description?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class DriverTripDetailResponseDto extends DriverTripResponseDto {
  bookingsCount: number;
  totalRevenue: number;
  confirmedRevenue: number;
  platformFee: number;
  netRevenue: number;
  vehicle?: any;
  amenities?: string[];
  metadata?: Record<string, any>;
}

export class DriverBookingResponseDto {
  id: number;
  bookingCode: string;
  tripId: number;
  tripDestination: string;
  passengerId: number;
  passengerName: string;
  passengerPhone?: string;
  seats: number;
  totalAmount: number;
  discountAmount: number;
  amountPaid: number;
  status: string;
  paymentStatus: string;
  isCheckedIn: boolean;
  checkedInAt?: Date;
  createdAt: Date;
}

export class CreateTripResponseDto {
  success: boolean;
  message: string;
  data: DriverTripResponseDto;
}

export class CancelTripResponseDto {
  success: boolean;
  message: string;
  data: {
    tripId: number;
    reference: string;
    status: string;
    refundedBookings: number;
    totalRefundAmount: number;
  };
}

export class ActivateTripResponseDto {
  success: boolean;
  message: string;
  data: DriverTripResponseDto;
}

export class CompleteTripResponseDto {
  success: boolean;
  message: string;
  data: {
    tripId: number;
    reference: string;
    status: string;
    completedBookings: number;
    totalEarnings: number;
    platformFee: number;
    netEarnings: number;
  };
}