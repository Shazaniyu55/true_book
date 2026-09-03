import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import { AdminOnly, PassengerOnly } from '@shared/decorators/roles.decorator';
import { AuthUser } from '@shared/decorators/authUser.decorator';
import { ServiceName } from '@shared/decorators/servicename.decorators';
import { Broker } from '@broker/broker';

import {
  ApproveTripRequestDto,
  CreateTripRequestDto,
  DeclineTripRequestDto,
  TripRequestListQueryDto,
} from '../dtos/trip-request.dto';

import { CreateTripRequestUsecase } from '../usecases/Createtriprequest.usecase';
import { GetMyTripRequestsUsecase } from '../usecases/Getmytriprequests.usecase';
import { ListTripRequestsUsecase } from '../usecases/Listtriprequests.usecase';
import { GetTripRequestUsecase } from '../usecases/Gettriprequest.usecase';
import { ApproveTripRequestUsecase } from '../usecases/Approvetriprequest.usecase';
import { DeclineTripRequestUsecase } from '../usecases/Declinetriprequest.usecase';

@ApiTags('Trip Requests')
@ApiBearerAuth()
@ServiceName('trip-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/trip-requests')
export class TripRequestController {
  constructor(
    private readonly broker: Broker,
    private readonly createTripRequestUsecase: CreateTripRequestUsecase,
    private readonly getMyTripRequestsUsecase: GetMyTripRequestsUsecase,
    private readonly listTripRequestsUsecase: ListTripRequestsUsecase,
    private readonly getTripRequestUsecase: GetTripRequestUsecase,
    private readonly approveTripRequestUsecase: ApproveTripRequestUsecase,
    private readonly declineTripRequestUsecase: DeclineTripRequestUsecase,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // PASSENGER routes
  // ──────────────────────────────────────────────────────────────────────────

  @PassengerOnly()
  @Post()
  @ApiOperation({
    summary: 'Passenger: Request a trip / get notified when available',
    description:
      'Use when a search returns no trips. Creates the request and automatically ' +
      'pools it with other passengers on the same route and date — no admin ' +
      'approval needed. The pool is pushed to the driver board ahead of departure ' +
      '(12h intra-state, 18h inter-state); the passenger is notified once a driver ' +
      'picks it up.',
  })
  createRequest(@AuthUser() user: any, @Body() dto: CreateTripRequestDto) {
    return this.broker.runUsecases([this.createTripRequestUsecase], {
      requesterId: user.sub,
      dto,
    });
  }

  @PassengerOnly()
  @Get('mine')
  @ApiOperation({ summary: 'Passenger: List my trip requests' })
  getMyRequests(@AuthUser() user: any, @Query() query: TripRequestListQueryDto) {
    return this.broker.runUsecases([this.getMyTripRequestsUsecase], {
      requesterId: user.sub,
      query,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ADMIN routes (trip dashboard)
  // ──────────────────────────────────────────────────────────────────────────

  @AdminOnly()
  @Get()
  @ApiOperation({
    summary: 'Admin: List trip requests',
    description: 'Trip dashboard queue. Filter with ?status=pending and paginate.',
  })
  listRequests(@Query() query: TripRequestListQueryDto) {
    return this.broker.runUsecases([this.listTripRequestsUsecase], query);
  }

  @AdminOnly()
  @Get(':id')
  @ApiOperation({ summary: 'Admin: Get a single trip request' })
  @ApiParam({ name: 'id', description: 'Trip request ID' })
  getRequest(@Param('id') id: string) {
    return this.broker.runUsecases([this.getTripRequestUsecase], { requestId: id });
  }

  @AdminOnly()
  @Patch(':id/approve')
  @ApiOperation({
    summary: 'Admin: Approve a trip request',
    description:
      'Notifies the passenger. Pass a tripId to attach an existing trip (marks the request fulfilled).',
  })
  @ApiParam({ name: 'id', description: 'Trip request ID' })
  approveRequest(
    @AuthUser() user: any,
    @Param('id') id: string,
    @Body() dto: ApproveTripRequestDto,
  ) {
    return this.broker.runUsecases([this.approveTripRequestUsecase], {
      adminId: user.sub,
      requestId: id,
      dto,
    });
  }

  @AdminOnly()
  @Patch(':id/decline')
  @ApiOperation({
    summary: 'Admin: Decline a trip request',
    description: 'Notifies the passenger with the reason.',
  })
  @ApiParam({ name: 'id', description: 'Trip request ID' })
  declineRequest(
    @AuthUser() user: any,
    @Param('id') id: string,
    @Body() dto: DeclineTripRequestDto,
  ) {
    return this.broker.runUsecases([this.declineTripRequestUsecase], {
      adminId: user.sub,
      requestId: id,
      dto,
    });
  }
}

// import {
//   Body,
//   Controller,
//   Get,
//   Param,
//   Patch,
//   Post,
//   Query,
//   UseGuards,
// } from '@nestjs/common';
// import {
//   ApiBearerAuth,
//   ApiOperation,
//   ApiParam,
//   ApiTags,
// } from '@nestjs/swagger';

// import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
// import { RolesGuard } from '@shared/guards/roles.guard';
// import { AdminOnly, PassengerOnly } from '@shared/decorators/roles.decorator';
// import { AuthUser } from '@shared/decorators/authUser.decorator';
// import { ServiceName } from '@shared/decorators/servicename.decorators';
// import { Broker } from '@broker/broker';

// import {
//   ApproveTripRequestDto,
//   CreateTripRequestDto,
//   DeclineTripRequestDto,
//   TripRequestListQueryDto,
// } from '../dtos/trip-request.dto';

// import { CreateTripRequestUsecase } from '../usecases/Createtriprequest.usecase';
// import { GetMyTripRequestsUsecase } from '../usecases/Getmytriprequests.usecase';
// import { ListTripRequestsUsecase } from '../usecases/Listtriprequests.usecase';
// import { GetTripRequestUsecase } from '../usecases/Gettriprequest.usecase';
// import { ApproveTripRequestUsecase } from '../usecases/Approvetriprequest.usecase';
// import { DeclineTripRequestUsecase } from '../usecases/Declinetriprequest.usecase';

// @ApiTags('Trip Requests')
// @ApiBearerAuth()
// @ServiceName('trip-requests')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Controller('v1/trip-requests')
// export class TripRequestController {
//   constructor(
//     private readonly broker: Broker,
//     private readonly createTripRequestUsecase: CreateTripRequestUsecase,
//     private readonly getMyTripRequestsUsecase: GetMyTripRequestsUsecase,
//     private readonly listTripRequestsUsecase: ListTripRequestsUsecase,
//     private readonly getTripRequestUsecase: GetTripRequestUsecase,
//     private readonly approveTripRequestUsecase: ApproveTripRequestUsecase,
//     private readonly declineTripRequestUsecase: DeclineTripRequestUsecase,
//   ) {}

//   // ──────────────────────────────────────────────────────────────────────────
//   // PASSENGER routes
//   // ──────────────────────────────────────────────────────────────────────────

//   @PassengerOnly()
//   @Post()
//   @ApiOperation({
//     summary: 'Passenger: Request a trip / get notified when available',
//     description:
//       'Use when a search returns no trips. Creates a pending request, alerts admins on the trip dashboard, and the passenger is pushed a notification once an admin approves.',
//   })
//   createRequest(@AuthUser() user: any, @Body() dto: CreateTripRequestDto) {
//     return this.broker.runUsecases([this.createTripRequestUsecase], {
//       requesterId: user.sub,
//       dto,
//     });
//   }

//   @PassengerOnly()
//   @Get('mine')
//   @ApiOperation({ summary: 'Passenger: List my trip requests' })
//   getMyRequests(@AuthUser() user: any, @Query() query: TripRequestListQueryDto) {
//     return this.broker.runUsecases([this.getMyTripRequestsUsecase], {
//       requesterId: user.sub,
//       query,
//     });
//   }

//   // ──────────────────────────────────────────────────────────────────────────
//   // ADMIN routes (trip dashboard)
//   // ──────────────────────────────────────────────────────────────────────────

//   @AdminOnly()
//   @Get()
//   @ApiOperation({
//     summary: 'Admin: List trip requests',
//     description: 'Trip dashboard queue. Filter with ?status=pending and paginate.',
//   })
//   listRequests(@Query() query: TripRequestListQueryDto) {
//     return this.broker.runUsecases([this.listTripRequestsUsecase], query);
//   }

//   @AdminOnly()
//   @Get(':id')
//   @ApiOperation({ summary: 'Admin: Get a single trip request' })
//   @ApiParam({ name: 'id', description: 'Trip request ID' })
//   getRequest(@Param('id') id: string) {
//     return this.broker.runUsecases([this.getTripRequestUsecase], { requestId: id });
//   }

//   @AdminOnly()
//   @Patch(':id/approve')
//   @ApiOperation({
//     summary: 'Admin: Approve a trip request',
//     description:
//       'Notifies the passenger. Pass a tripId to attach an existing trip (marks the request fulfilled).',
//   })
//   @ApiParam({ name: 'id', description: 'Trip request ID' })
//   approveRequest(
//     @AuthUser() user: any,
//     @Param('id') id: string,
//     @Body() dto: ApproveTripRequestDto,
//   ) {
//     return this.broker.runUsecases([this.approveTripRequestUsecase], {
//       adminId: user.sub,
//       requestId: id,
//       dto,
//     });
//   }

//   @AdminOnly()
//   @Patch(':id/decline')
//   @ApiOperation({
//     summary: 'Admin: Decline a trip request',
//     description: 'Notifies the passenger with the reason.',
//   })
//   @ApiParam({ name: 'id', description: 'Trip request ID' })
//   declineRequest(
//     @AuthUser() user: any,
//     @Param('id') id: string,
//     @Body() dto: DeclineTripRequestDto,
//   ) {
//     return this.broker.runUsecases([this.declineTripRequestUsecase], {
//       adminId: user.sub,
//       requestId: id,
//       dto,
//     });
//   }
// }