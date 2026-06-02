import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { DriverOnly, PassengerOnly } from '@shared/decorators/roles.decorator';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { Public } from '@shared/decorators/isPublic.decorator';
import { ServiceName } from '@shared/decorators/servicename.decorators';
import { TripsService } from '../service/trip.service';
import {
  BookTripDto,
  CancelBookingDto,
  CancelTripDto,
  CompleteTripDto,
  CreateTripDto,
  SearchTripsDto,
  TripListQueryDto,
  UpdateTripDto,
} from '../dtos/trip.dto';
import { string } from 'joi';
import { CreateTripUsecase } from '../usecases/createtrip.usecase';
import { Broker } from '@broker/broker';
import { SearchTripUsecase } from '../usecases/searchtrip.usecase';
import { GetTripUsecase } from '../usecases/gettrip.usecase';
import { ActivateTripUsecase } from '../usecases/activatetrip.usecase';
import { UpdateTripUsecase } from '../usecases/updatetrip.usecase';
import { CompleteTripUsecase } from '../usecases/completetrip.usecase';
import { CancleTripUsecase } from '../usecases/cancletrip.usecase';
import { GetMyTripUsecase } from '../usecases/getmytrip.usecase';
import { GetMyBookingsUsecase } from '../usecases/getmybooking.usecase';
import { GetTripBookingsUsecase } from '../usecases/gettripbookings.usecase';
import { CheckInPassengerUsecase } from '../usecases/checkinpassenger.usecase';
import { CancleBookingUsecase } from '../usecases/canclebooking.usecase';
import { GetBookingCodeUsecase } from '../usecases/getbookingcode.usecase';
import { BookTripUsecase } from '../usecases/booktrip.usecase';

@ApiTags('Trips')
@ApiBearerAuth()
@ServiceName('trips')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/trips')
export class TripsController {
  constructor(
    private readonly broker: Broker,
    private readonly createTripUsecase:CreateTripUsecase,
    private readonly searchTripeUsecase: SearchTripUsecase,
    private readonly getTripUsecase: GetTripUsecase,
    private readonly activateTripUsecase:ActivateTripUsecase,
    private readonly updateTripUsecase:UpdateTripUsecase,
    private readonly completeTripUsecase: CompleteTripUsecase,
    private readonly cancleTripUsecase:CancleTripUsecase,
    private readonly getMyTripUsecase:GetMyTripUsecase,
    private readonly getMyBookingsUsecase:GetMyBookingsUsecase,
    private readonly getTripBookingUsecase:GetTripBookingsUsecase,
    private readonly checkInPassengerUsecase:CheckInPassengerUsecase,
    private readonly cancleBookingUsecase:CancleBookingUsecase,
    private readonly getBookingCodeUsecase:GetBookingCodeUsecase,
    private readonly bookTripUsecase:BookTripUsecase
  
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC — search & view (no auth required)
  // ──────────────────────────────────────────────────────────────────────────

  @Public()
  @Get('search-trip')
  @ApiOperation({
    summary: 'Search available trips',
    description: 'Filter by origin, destination, date, seats, price. Publicly accessible.',
  })
  searchTrips(@Query() dto: SearchTripsDto) {
    return this.broker.runUsecases([this.searchTripeUsecase], dto)
  }

  @Public()
  @Get('get-trip/:tripId')
  @ApiOperation({ summary: 'Get trip detail by ID' })
  @ApiParam({ name: 'tripId', type: string })
  getTripById(
    @Param("tripId") tripId: string,
  ) {
    return this.broker.runUsecases([this.getTripUsecase], {tripId: tripId})
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DRIVER routes
  // ──────────────────────────────────────────────────────────────────────────

  @DriverOnly()
  @Post('driver/create-trip')
  @ApiOperation({
    summary: 'Driver: Create a new trip',
    description: 'Trip starts in PENDING state. Call /activate to open it for bookings.',
  })
  createTrip(@AuthUser() user: any,@Body() dto: CreateTripDto) {
    return this.broker.runUsecases([this.createTripUsecase], {id:user.sub, dto:dto})
  }

  @DriverOnly()
  @Patch(':tripId/drivers/activate-trip')
  @ApiOperation({ summary: 'Driver: Activate trip — opens it for bookings' })
  activateTrip(@AuthUser() user: any, @Param('tripId') tripId: string) {
    return this.broker.runUsecases([this.activateTripUsecase], {id:user.sub, tripId: tripId})
  }

  @DriverOnly()
  @Put(':tripId/drivers/update-trip')
  @ApiOperation({ summary: 'Driver: Update trip details (no confirmed bookings required)' })
  updateTrip(
    @AuthUser() user: any,
    @Param('tripId') tripId: string,
    @Body() dto: UpdateTripDto
  ) {
    return this.broker.runUsecases([this.updateTripUsecase],{ id: user.id, tripId: tripId, dto: dto})
  }

  @DriverOnly()
  @Post('driver/complete-trip')
  @ApiOperation({
    summary: 'Driver: Mark trip as completed',
    description:
      'Releases escrow funds to driver wallet. All confirmed bookings become completed.',
  })
  completeTrip(@AuthUser() user: any, @Body() dto: CompleteTripDto) {
    return this.broker.runUsecases([this.completeTripUsecase], {id:user.sub, dto: dto})
  }

  @DriverOnly()
  @Post('cancel')
  @ApiOperation({
    summary: 'Driver: Cancel trip',
    description: 'Cancels trip and initiates refunds for all confirmed passengers.',
  })
  cancelTrip(@AuthUser() user: any, @Body() dto: CancelTripDto) {
    return this.broker.runUsecases([this.cancleTripUsecase], {id: user.sub, dto:dto})
  }

  @DriverOnly()
  @Get('driver/my-trips')
  @ApiOperation({ summary: 'Driver: List my trips' })
  getMyTrips(
      @AuthUser() user?: any,
    @Query() query?: TripListQueryDto

  ) {
    return this.broker.runUsecases([this.getMyTripUsecase], {id:user.sub, dto: query})
  }

  @DriverOnly()
  @Get(':tripId/bookings')
  @ApiOperation({ summary: 'Driver: View all bookings for a trip' })
  getTripBookings( @AuthUser() user: any, @Param('tripId') tripId: string) {
    return this.broker.runUsecases([this.getTripBookingUsecase], {id:user.sub, tripId: tripId})
  }

  @DriverOnly()
  @Patch('bookings/:bookingId/check-in')
  @ApiOperation({ summary: 'Driver: Check in a passenger at boarding' })
  checkIn(@AuthUser() user: any, @Param('bookingId') bookingId: string) {
    return this.broker.runUsecases([this.checkInPassengerUsecase], {id: user.sub, bookingId: bookingId})
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PASSENGER routes
  // ──────────────────────────────────────────────────────────────────────────

  @PassengerOnly()
  @Post('book')
  @ApiOperation({
    summary: 'Passenger: Book a trip seat',
    description:
      'Returns a Paystack payment link. Funds are held in escrow and released to the driver only after trip completion.',
  })
  bookTrip(@AuthUser() user: any, @Body() dto: BookTripDto) {
    return this.broker.runUsecases([this.bookTripUsecase], {id: user.sub, dto: dto})
  }

  @PassengerOnly()
  @Get('passenger/my-bookings')
  @ApiOperation({ summary: 'Passenger: List my bookings' })
  getMyBookings(
    @Query() query?: TripListQueryDto,
    @AuthUser() user?: any,
  ) {
    return this.broker.runUsecases([this.getMyBookingsUsecase], {id:user.sub, dto:query})
  }

  @PassengerOnly()
  @Post('bookings/cancel')
  @ApiOperation({
    summary: 'Passenger: Cancel a booking',
    description: 'Must cancel at least 2 hours before departure. Refund is initiated automatically.',
  })
  cancelBooking(@AuthUser() user: any, @Body() dto: CancelBookingDto) {
    return this.broker.runUsecases([this.cancleBookingUsecase], {id:user.sub, dto: dto})
  }

  @PassengerOnly()
  @Get('bookings/:code')
  @ApiOperation({ summary: 'Passenger: Get booking by code' })
  getBooking(@AuthUser() user: any, @Param('code') code: string) {
    return this.broker.runUsecases([this.getBookingCodeUsecase], {id: user.sub, bookingCode:code})
  }
}