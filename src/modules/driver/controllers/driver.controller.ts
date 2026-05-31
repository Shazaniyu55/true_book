import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthUser } from '@shared/decorators/authUser.decorator';

import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';

import {
  CreateDriverTripDto,
  UpdateDriverTripDto,
  CancelDriverTripDto,
  CompleteDriverTripDto,
  ActivateDriverTripDto,
  GetDriverTripsQueryDto,
  GetDriverTripsBookingsQueryDto,
  CreateTripResponseDto,
  CancelTripResponseDto,
  ActivateTripResponseDto,
  CompleteTripResponseDto,
  DriverTripResponseDto,
  DriverTripDetailResponseDto,
  DriverBookingResponseDto,
} from '../dtos/create-driver.dto';
import { DriverTripService } from '../services/driver.service';
import { TripsService } from '@modules/trip/service/trip.service';
import { Broker } from '@broker/broker';
import { CreateDriverTripUseCase } from '../usecases/driver.usecases';
import { RolesGuard } from '@shared/guards/roles.guard';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DRIVER TRIP CONTROLLER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Handles all driver-initiated trip operations:
 * - Create, Update, Activate, Cancel, Complete trips
 * - Retrieve trip details and bookings
 */

@ApiTags('Driver - Trips')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/drivers')
export class DriverTripController {
  constructor(
    private readonly broker: Broker,
    private readonly driverTripService: DriverTripService,
    private readonly tripsService: TripsService, // For reading trip data
    private readonly createDriverUsecase: CreateDriverTripUseCase 
  ) {}

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * CREATE TRIP
   * ─────────────────────────────────────────────────────────────────────────
   */

@Post('trip/create')
@HttpCode(HttpStatus.CREATED)
async createTrip(
  @AuthUser() user: any,
  @Body() dto: CreateDriverTripDto,
): Promise<CreateTripResponseDto> {
  const trip = await this.driverTripService.createTrip(user.id, dto); 

  return {
    success: true,
    message: 'Trip created successfully',
    data: this.mapTripToResponse(trip),
  };
}

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * GET MY TRIPS (PAGINATED)
   * ─────────────────────────────────────────────────────────────────────────
   */

  @Get('trip/getTrip')
  @ApiOperation({
    summary: 'Get all your trips',
    description: 'Retrieve a paginated list of your trips with optional filtering by status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trips retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Driver profile not found',
  })
  async getMyTrips(
    @AuthUser() user: any,
    @Query() query: GetDriverTripsQueryDto,
  ) {
    return this.tripsService.getMyTrips(user.id, {
      page: query.page,
      limit: query.limit,
      status: query.status,
    });
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * GET TRIP DETAIL
   * ─────────────────────────────────────────────────────────────────────────
   */

  @Get('trip/:tripId')
  @ApiOperation({
    summary: 'Get trip detail',
    description: 'Get detailed information about a specific trip.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trip details retrieved',
    type: DriverTripDetailResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found',
  })
  async getTripDetail(
    @AuthUser() user: string,
    @Param('tripId') tripId: string,
  ) {
    const trip = await this.tripsService.getTripById(tripId);

    return {
      success: true,
      data: {
        ...this.mapTripToResponse(trip),
        bookingsCount: trip.bookedSeats, // Could be enhanced with actual booking count
      },
    };
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * UPDATE TRIP (PENDING ONLY)
   * ─────────────────────────────────────────────────────────────────────────
   */

  @Put('trip/update/:tripId')
  @ApiOperation({
    summary: 'Update trip details',
    description: 'Update trip details. Only possible for PENDING trips without confirmed bookings.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trip updated successfully',
    type: DriverTripResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot update trip (e.g., has confirmed bookings)',
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found or does not belong to you',
  })
  async updateTrip(
    @AuthUser() user: any,
    @Param('tripId') tripId: string,
    @Body() dto: UpdateDriverTripDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: DriverTripResponseDto;
  }> {
    const trip = await this.driverTripService.updateTrip(user.id, tripId, dto);

    return {
      success: true,
      message: 'Trip updated successfully',
      data: this.mapTripToResponse(trip),
    };
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * ACTIVATE TRIP
   * ─────────────────────────────────────────────────────────────────────────
   */

  @Patch(':tripId/activate')
  @ApiOperation({
    summary: 'Activate trip',
    description: 'Activate (publish) a PENDING trip to accept bookings.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trip activated successfully',
    type: ActivateTripResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Trip is not in PENDING status',
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found',
  })
  async activateTrip(
    @AuthUser() user: any,
    @Param('tripId') tripId: string,
    @Body() _dto?: ActivateDriverTripDto,
  ): Promise<ActivateTripResponseDto> {
    const trip = await this.driverTripService.activateTrip(user.id, tripId);

    return {
      success: true,
      message: 'Trip activated successfully',
      data: this.mapTripToResponse(trip),
    };
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * CANCEL TRIP
   * ─────────────────────────────────────────────────────────────────────────
   */

  @Delete(':tripId/cancel')
  @ApiOperation({
    summary: 'Cancel trip',
    description:
      'Cancel a PENDING or ACTIVE trip. All confirmed bookings will be refunded automatically.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trip cancelled successfully',
    type: CancelTripResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Trip cannot be cancelled (already completed or cancelled)',
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found',
  })
  async cancelTrip(
    @AuthUser() user: any,
    @Param('tripId') tripId: string,
    @Body() dto: CancelDriverTripDto,
  ): Promise<CancelTripResponseDto> {
    const { trip, refundedBookings, totalRefundAmount } = await this.driverTripService.cancelTrip(
      user.id,
      tripId,
      dto,
    );

    return {
      success: true,
      message: 'Trip cancelled successfully',
      data: {
        tripId: trip.id,
        reference: trip.reference,
        status: trip.status,
        refundedBookings,
        totalRefundAmount,
      },
    };
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * COMPLETE TRIP
   * ─────────────────────────────────────────────────────────────────────────
   */

  @Patch(':tripId/complete')
  @ApiOperation({
    summary: 'Complete trip',
    description: 'Mark an ACTIVE trip as COMPLETED. This releases all held escrows.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trip completed successfully',
    type: CompleteTripResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Trip is not in ACTIVE status',
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found',
  })
  async completeTrip(
    @AuthUser() user: any,
    @Param('tripId') tripId: string,
    @Body() dto: CompleteDriverTripDto,
  ): Promise<CompleteTripResponseDto> {
    const { trip, completedBookings, totalEarnings, platformFee, netEarnings } =
      await this.driverTripService.completeTrip(user.id, tripId, dto);

    return {
      success: true,
      message: 'Trip completed successfully',
      data: {
        tripId: trip.id,
        reference: trip.reference,
        status: trip.status,
        completedBookings,
        totalEarnings,
        platformFee,
        netEarnings,
      },
    };
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * GET TRIP BOOKINGS
   * ─────────────────────────────────────────────────────────────────────────
   */

  @Get(':tripId/bookings')
  @ApiOperation({
    summary: 'Get trip bookings',
    description: 'Get all bookings for a specific trip.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bookings retrieved successfully',
    type: [DriverBookingResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found',
  })
  async getTripBookings(
    @AuthUser() user: any,
    @Param('tripId') tripId: string,
    @Query() _query?: GetDriverTripsBookingsQueryDto,
  ) {
    const bookings = await this.tripsService.getTripBookings(user.id, tripId);

    return {
      success: true,
      data: bookings.map(booking => this.mapBookingToResponse(booking)),
    };
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * CHECK-IN PASSENGER
   * ─────────────────────────────────────────────────────────────────────────
   */

  @Post('bookings/:bookingId/check-in')
  @ApiOperation({
    summary: 'Check in passenger',
    description: 'Check in a passenger for a booking.',
  })
  @ApiResponse({
    status: 200,
    description: 'Passenger checked in successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Booking not found',
  })
  async checkInPassenger(
    @AuthUser() user: any,
    @Param('bookingId') bookingId: string,
  ) {
    const booking = await this.tripsService.checkInPassenger(user.id, bookingId);

    return {
      success: true,
      message: 'Passenger checked in successfully',
      data: this.mapBookingToResponse(booking),
    };
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * HELPER METHODS
   * ─────────────────────────────────────────────────────────────────────────
   */

  private mapTripToResponse(trip: any): DriverTripResponseDto {
    return {
      id: trip.id,
      reference: trip.reference,
      origin: trip.origin,
      destination: trip.destination,
      departureTime: trip.departureTime,
      totalSeats: trip.totalSeats,
      bookedSeats: trip.bookedSeats,
      availableSeats: trip.totalSeats - trip.bookedSeats,
      pricePerSeat: trip.pricePerSeat,
      description: trip.description,
      status: trip.status,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
    };
  }

  private mapBookingToResponse(booking: any): DriverBookingResponseDto {
    return {
      id: booking.id,
      bookingCode: booking.bookingCode,
      tripId: booking.tripId,
      tripDestination: booking.trip?.destination || '',
      passengerId: booking.passengerId,
      passengerName: booking.passenger?.user?.name || '',
      passengerPhone: booking.passenger?.phoneNumber || '',
      seats: booking.seats,
      totalAmount: booking.totalAmount,
      discountAmount: booking.discountAmount,
      amountPaid: booking.amountPaid,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      isCheckedIn: booking.isCheckedIn,
      checkedInAt: booking.checkedInAt,
      createdAt: booking.createdAt,
    };
  }
}

// function CurrentUser(): (target: DriverTripController, propertyKey: "createTrip", parameterIndex: 0) => void {
//     throw new Error('Function not implemented.');
// }
