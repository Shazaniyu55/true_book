import { IsString, IsNumber, IsOptional, Matches, Min, Max, IsNotEmpty, ValidateNested, IsArray, IsDateString, IsObject, IsUUID } from 'class-validator';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DRIVER TRIP CREATION DTOs
 * ═══════════════════════════════════════════════════════════════════════════
 */
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;



export class CreateDriverTripDto {
  // ── departure (required) ──
  @IsDateString()
  @IsNotEmpty()
  departureDate: string;

  @IsString()
  @Matches(TIME_REGEX, { message: 'departureTime must be in HH:mm format' })
  @IsNotEmpty()
  departureTime: string;

  @IsString()
  @IsNotEmpty()
  departureLocation: string;

  @IsArray()
  @IsOptional()
  departureLatlong?: any[];

  // ── arrival (optional) ──
  @IsDateString()
  @IsOptional()
  arrivalDate?: string;

  @IsString()
  @Matches(TIME_REGEX, { message: 'arrivalTime must be in HH:mm format' })
  @IsOptional()
  arrivalTime?: string;

  @IsArray()
  @IsOptional()
  arrivalDestination?: any[];

  // ── stations / stops (optional) ──
  @IsString()
  @IsOptional()
  pickStation?: string;

  @IsString()
  @IsOptional()
  dropOffStation?: string;

  @IsArray()
  @IsOptional()
  busStop?: any[];

  @IsArray()
  @IsOptional()
  busstopLatlong?: any[];

  // ── trip details (optional) ──
  @IsArray()
  @IsOptional()
  tripSpecification?: any[];

  @IsArray()
  @IsOptional()
  waypoints?: any[];                     // ← ADDED: entity has it, DTO didn't

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  vehicleFeatures ?: string[];                  // ← CHANGED: entity is jsonb string[], not string

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;        // ← @ValidateNested needs a typed class; @IsObject is simpler for free-form jsonb

  // ── booking window (optional) ──
  @IsDateString()
  @IsOptional()
  bookingClosingDate?: string;

  @IsString()
  @Matches(TIME_REGEX, { message: 'bookingClosingTime must be in HH:mm format' })
  @IsOptional()
  bookingClosingTime?: string;

  // ── seats (required — entity totalSeats & availableSeats are NOT NULL) ──
  @IsNumber()
  @Min(1)
  @Max(50)
  totalSeats: number;                    // ← ADDED: entity requires it

  @IsNumber()
  @Min(1)
  @Max(50)
  availableSeats: number;

  // ── money (required) ──
  @IsNumber()
  @Min(100)
  price: number;

  // ── vehicle (optional) ──
  @IsUUID()
  @IsOptional()
  vehicleId?: string;                    // ← entity is uuid; @IsUUID validates the format
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
  features?: string;

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
  tripId: string;
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
    tripId: string;
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
    tripId: string;
    reference: string;
    status: string;
    completedBookings: number;
    totalEarnings: number;
    platformFee: number;
    netEarnings: number;
  };
}

export class PassengerFeedbackDto {
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;
}