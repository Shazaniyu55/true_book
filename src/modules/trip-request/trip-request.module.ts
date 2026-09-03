import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { Broker } from '@broker/broker';

import { TripRequest } from '@modules/core/entities/trip-request.entity';
import { Passenger } from '@modules/core/entities/passenger.entity';

import { TripRequestRepository } from '@adapters/repositories/trip-request.repository';
import { TripMatchingModule } from '@modules/trip-matching/trip-matching.module';
import { TripRequestController } from './controller/trip-request.controller';
import { TripRequestService } from './service/trip-request.service';

import { CreateTripRequestUsecase } from './usecases/Createtriprequest.usecase';
import { GetMyTripRequestsUsecase } from './usecases/Getmytriprequests.usecase';
import { ListTripRequestsUsecase } from './usecases/Listtriprequests.usecase';
import { GetTripRequestUsecase } from './usecases/Gettriprequest.usecase';
import { ApproveTripRequestUsecase } from './usecases/Approvetriprequest.usecase';
import { DeclineTripRequestUsecase } from './usecases/Declinetriprequest.usecase';

@Module({
  imports: [
    ConfigModule,
    // NotificationService is provided by the @Global() NotificationModule,
    // so it does not need to be imported here.
    TypeOrmModule.forFeature([TripRequest, Passenger]),
    // Exposes TripMatchingService so a new request is pooled automatically
    // the moment it's created (no admin approval step).
    TripMatchingModule,
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
// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { ConfigModule } from '@nestjs/config';

// import { Broker } from '@broker/broker';

// import { TripRequest } from '@modules/core/entities/trip-request.entity';
// import { Passenger } from '@modules/core/entities/passenger.entity';

// import { TripRequestRepository } from '@adapters/repositories/trip-request.repository';
// import { TripRequestController } from './controller/trip-request.controller';
// import { TripRequestService } from './service/trip-request.service';

// import { CreateTripRequestUsecase } from './usecases/Createtriprequest.usecase';
// import { GetMyTripRequestsUsecase } from './usecases/Getmytriprequests.usecase';
// import { ListTripRequestsUsecase } from './usecases/Listtriprequests.usecase';
// import { GetTripRequestUsecase } from './usecases/Gettriprequest.usecase';
// import { ApproveTripRequestUsecase } from './usecases/Approvetriprequest.usecase';
// import { DeclineTripRequestUsecase } from './usecases/Declinetriprequest.usecase';

// @Module({
//   imports: [
//     ConfigModule,
//     // NotificationService is provided by the @Global() NotificationModule,
//     // so it does not need to be imported here.
//     TypeOrmModule.forFeature([TripRequest, Passenger]),
//   ],
//   controllers: [TripRequestController],
//   providers: [
//     Broker,
//     TripRequestRepository,
//     TripRequestService,
//     CreateTripRequestUsecase,
//     GetMyTripRequestsUsecase,
//     ListTripRequestsUsecase,
//     GetTripRequestUsecase,
//     ApproveTripRequestUsecase,
//     DeclineTripRequestUsecase,
//   ],
//   exports: [TripRequestService, TripRequestRepository],
// })
// export class TripRequestModule {}