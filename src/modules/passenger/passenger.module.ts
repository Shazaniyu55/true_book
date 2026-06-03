import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Passenger } from '@modules/core/entities/passenger.entity';
import { User } from '@modules/core/entities/user.entity';
import { Booking } from '@modules/core/entities/booking.entity';
import { PassengerController } from './controllers/passanger.controller';
import { PassengerService } from './services/passanger.service';
import { PassengerRepository } from '@adapters/repositories/passenger.repository';
import { CloudinaryModule } from '@modules/cloudinary/cloudinary.module';
import { Broker } from '@broker/broker';
import { GetPassengerProfileUsecase } from './usecases/getprofile.usecase';
import { GetPassengerDashBoardUsecase } from './usecases/getdashboard.usecase';
import { DeleteUserAccountUsecase } from './usecases/deleteacct.usecase';



@Module({
  imports: [
    CloudinaryModule,
    TypeOrmModule.forFeature([Passenger, User, Booking]),
  ],
  controllers: [PassengerController],
  providers: [
    Broker,
    PassengerService,
    PassengerRepository,
    GetPassengerProfileUsecase,
    DeleteUserAccountUsecase,
    GetPassengerDashBoardUsecase
  
  ],
  exports: [PassengerService, PassengerRepository],  // exported so AuthModule can call ensureProfile()
})
export class PassengerModule {}