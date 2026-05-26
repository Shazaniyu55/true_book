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
  UpdateTripDto,
} from '../dtos/trip.dto';

@ApiTags('Trips')
@ApiBearerAuth()
@ServiceName('trips')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC — search & view (no auth required)
  // ──────────────────────────────────────────────────────────────────────────

  @Public()
  @Get('search')
  @ApiOperation({
    summary: 'Search available trips',
    description: 'Filter by origin, destination, date, seats, price. Publicly accessible.',
  })
  searchTrips(@Query() dto: SearchTripsDto) {
    return this.tripsService.searchTrips(dto);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get trip detail by ID' })
  @ApiParam({ name: 'id', type: Number })
  getTripById(@Param('id', ParseIntPipe) id: number) {
    return this.tripsService.getTripById(id);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DRIVER routes
  // ──────────────────────────────────────────────────────────────────────────

  @DriverOnly()
  @Post('driver/create')
  @ApiOperation({
    summary: 'Driver: Create a new trip',
    description: 'Trip starts in PENDING state. Call /activate to open it for bookings.',
  })
  createTrip(@Body() dto: CreateTripDto, @AuthUser() user: any) {
    return this.tripsService.createTrip(user.id, dto);
  }

  @DriverOnly()
  @Patch(':id/activate')
  @ApiOperation({ summary: 'Driver: Activate trip — opens it for bookings' })
  activateTrip(@Param('id', ParseIntPipe) id: number, @AuthUser() user: any) {
    return this.tripsService.activateTrip(user.id, id);
  }

  @DriverOnly()
  @Put(':id')
  @ApiOperation({ summary: 'Driver: Update trip details (no confirmed bookings required)' })
  updateTrip(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTripDto,
    @AuthUser() user: any,
  ) {
    return this.tripsService.updateTrip(user.id, id, dto);
  }

  @DriverOnly()
  @Post('complete')
  @ApiOperation({
    summary: 'Driver: Mark trip as completed',
    description:
      'Releases escrow funds to driver wallet. All confirmed bookings become completed.',
  })
  completeTrip(@Body() dto: CompleteTripDto, @AuthUser() user: any) {
    return this.tripsService.completeTrip(user.id, dto);
  }

  @DriverOnly()
  @Post('cancel')
  @ApiOperation({
    summary: 'Driver: Cancel trip',
    description: 'Cancels trip and initiates refunds for all confirmed passengers.',
  })
  cancelTrip(@Body() dto: CancelTripDto, @AuthUser() user: any) {
    return this.tripsService.cancelTrip(user.id, dto);
  }

  @DriverOnly()
  @Get('driver/my-trips')
  @ApiOperation({ summary: 'Driver: List my trips' })
  getMyTrips(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @AuthUser() user?: any,
  ) {
    return this.tripsService.getMyTrips(user.id, { page, limit, status });
  }

  @DriverOnly()
  @Get(':id/bookings')
  @ApiOperation({ summary: 'Driver: View all bookings for a trip' })
  getTripBookings(@Param('id', ParseIntPipe) id: number, @AuthUser() user: any) {
    return this.tripsService.getTripBookings(user.id, id);
  }

  @DriverOnly()
  @Patch('bookings/:bookingId/check-in')
  @ApiOperation({ summary: 'Driver: Check in a passenger at boarding' })
  checkIn(@Param('bookingId', ParseIntPipe) bookingId: number, @AuthUser() user: any) {
    return this.tripsService.checkInPassenger(user.id, bookingId);
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
  bookTrip(@Body() dto: BookTripDto, @AuthUser() user: any) {
    return this.tripsService.bookTrip(user.id, dto);
  }

  @PassengerOnly()
  @Get('passenger/my-bookings')
  @ApiOperation({ summary: 'Passenger: List my bookings' })
  getMyBookings(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @AuthUser() user?: any,
  ) {
    return this.tripsService.getMyBookings(user.id, { page, limit, status });
  }

  @PassengerOnly()
  @Post('bookings/cancel')
  @ApiOperation({
    summary: 'Passenger: Cancel a booking',
    description: 'Must cancel at least 2 hours before departure. Refund is initiated automatically.',
  })
  cancelBooking(@Body() dto: CancelBookingDto, @AuthUser() user: any) {
    return this.tripsService.cancelBooking(user.id, dto);
  }

  @PassengerOnly()
  @Get('bookings/:code')
  @ApiOperation({ summary: 'Passenger: Get booking by code' })
  getBooking(@Param('code') code: string, @AuthUser() user: any) {
    return this.tripsService.getBookingByCode(code, user.id);
  }
}