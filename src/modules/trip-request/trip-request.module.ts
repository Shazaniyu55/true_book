import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { Broker } from '@broker/broker';

import { TripRequest } from '@modules/core/entities/trip-request.entity';
import { Passenger } from '@modules/core/entities/passenger.entity';

import { TripRequestRepository } from '@adapters/repositories/trip-request.repository';
import { TripRequestController } from './controller/trip-request.controller';
import { TripRequestService } from './service/trip-request.service';

import { CreateTripRequestUsecase } from './usecases/createtriprequest.usecase';
import { GetMyTripRequestsUsecase } from './usecases/getmytriprequests.usecase';
import { ListTripRequestsUsecase } from './usecases/listtriprequests.usecase';
import { GetTripRequestUsecase } from './usecases/gettriprequest.usecase';
import { ApproveTripRequestUsecase } from './usecases/approvetriprequest.usecase';
import { DeclineTripRequestUsecase } from './usecases/declinetriprequest.usecase';

@Module({
  imports: [
    ConfigModule,
    // NotificationService is provided by the @Global() NotificationModule,
    // so it does not need to be imported here.
    TypeOrmModule.forFeature([TripRequest, Passenger]),
  ],
  controllers: [TripRequestController],
  providers: [
    Broker,
    TripRequestRepository,
    TripRequestService,
    CreateTripRequestUsecase,
    GetMyTripRequestsUsecase,
    ListTripRequestsUsecase,
    GetTripRequestUsecase,
    ApproveTripRequestUsecase,
    DeclineTripRequestUsecase,
  ],
  exports: [TripRequestService, TripRequestRepository],
})
export class TripRequestModule {}