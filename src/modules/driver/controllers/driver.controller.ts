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
import { Broker } from '@broker/broker';
import { CreateDriverTripUsecase } from '../usecases/createTrip.usecase';
import { RolesGuard } from '@shared/guards/roles.guard';
import { DriverOnly } from '@shared/decorators/roles.decorator';
import { UpdateDriverTripUsecase } from '../usecases/updateTrip.usecase';
import { ActivateDriverTripUsecase } from '../usecases/activatetrip.usecase';
import { CancleDriverTripUsecase } from '../usecases/cancletrip.usecase';
import { CompleteDriverTripUsecase } from '../usecases/completetrip.usecase';
import { GetTripBookingsUsecase } from '@modules/trip/usecases/gettripbookings.usecase';
import { CheckInPassengerUsecase } from '@modules/trip/usecases/checkinpassenger.usecase';
import { GetTripUsecase } from '@modules/trip/usecases/gettrip.usecase';
import { GetMyTripUsecase } from '@modules/trip/usecases/getmytrip.usecase';
import { TripListQueryDto } from '@modules/trip/dtos/trip.dto';

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
    private readonly createDriverTripUsecase: CreateDriverTripUsecase,
    private readonly updateDriverTripUsecase:UpdateDriverTripUsecase,
    private readonly activateDriverTripUsecase:ActivateDriverTripUsecase,
    private readonly cancleDriverTripUsecase:CancleDriverTripUsecase,
    private readonly completeDriverTripUseCase:CompleteDriverTripUsecase,
    private readonly getTripBookingsUseCase:GetTripBookingsUsecase,
    private readonly checkInPassengerUsecase: CheckInPassengerUsecase,
    private readonly getTripUsecase:GetTripUsecase,
    private readonly getMyTripUsecase:GetMyTripUsecase
  ) {}

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * CREATE TRIP
   * ─────────────────────────────────────────────────────────────────────────
   */
@DriverOnly()
@Post('trip/create')
@HttpCode(HttpStatus.CREATED)
async createTrip(
  @AuthUser() user: any,
  @Body() dto: CreateDriverTripDto,
): Promise<CreateTripResponseDto> {
  return this.broker.runUsecases([this.createDriverTripUsecase], {id: user.sub, dto: dto})
 
}

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * GET MY TRIPS (PAGINATED)
   * ─────────────────────────────────────────────────────────────────────────
   */
  @DriverOnly()
  @Get('trip/getTrip')
  @ApiOperation({
    summary: 'Get all your trips',
    description: 'Retrieve a paginated list of your trips with optional filtering by status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trips retrieved successfully',
  })

  async getMyTrips(
    @AuthUser() user: any,
    @Query() query: TripListQueryDto,
  ) {
    return this.broker.runUsecases([this.getMyTripUsecase], {id: user.sub, dto: query})
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * GET TRIP DETAIL
   * ─────────────────────────────────────────────────────────────────────────
   */
  @DriverOnly()
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

  async getTripDetail(
    @AuthUser() user: string,
    @Param('tripId') tripId: string,
  ) {
    return this.broker.runUsecases([this.getTripUsecase], {id: user.sub, tripId: tripId})
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * UPDATE TRIP (PENDING ONLY)
   * ─────────────────────────────────────────────────────────────────────────
   */
  @DriverOnly()
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
 
  async updateTrip(
    @AuthUser() user: any,
    @Param('tripId') tripId: string,
    @Body() dto: UpdateDriverTripDto,
  ) {
    return this.broker.runUsecases([this.updateDriverTripUsecase], {id: user.sub, tripId: tripId, dto: dto})
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * ACTIVATE TRIP
   * ─────────────────────────────────────────────────────────────────────────
   */
  @DriverOnly()
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

  async activateTrip(
    @AuthUser() user: any,
    @Param('tripId') tripId: string,
  ) {
     return this.broker.runUsecases([this.activateDriverTripUsecase], {id:user.sub, tripId: tripId})
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * CANCEL TRIP
   * ─────────────────────────────────────────────────────────────────────────
   */
  @DriverOnly()
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

  async cancelTrip(
    @AuthUser() user: any,
    @Param('tripId') tripId: string,
    @Body() dto: CancelDriverTripDto,
  ) {
    return this.broker.runUsecases([this.cancleDriverTripUsecase], {id:user.sub, tripId:tripId, dto:dto})
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * COMPLETE TRIP
   * ─────────────────────────────────────────────────────────────────────────
   */
  @DriverOnly()
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

  async completeTrip(
    @AuthUser() user: any,
    @Param('tripId') tripId: string,
    @Body() dto: CompleteDriverTripDto,
  ){
    return this.broker.runUsecases([this.completeDriverTripUseCase], {id: user.sub, tripId:tripId, dto: dto})
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * GET TRIP BOOKINGS
   * ─────────────────────────────────────────────────────────────────────────
   */
  @DriverOnly()
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

  async getTripBookings(
    @AuthUser() user: any,
    @Param('tripId') tripId: string,
  ) {
    return this.broker.runUsecases([this.getTripBookingsUseCase], {id: user.sub, tripId:tripId})
  }

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * CHECK-IN PASSENGER
   * ─────────────────────────────────────────────────────────────────────────
   */
  @DriverOnly()
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
   return this.broker.runUsecases([this.checkInPassengerUsecase], {id: user.sub, bookingId: bookingId})
  }



 
}

