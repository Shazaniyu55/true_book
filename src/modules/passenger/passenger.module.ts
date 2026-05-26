import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Passenger } from '@modules/core/entities/passenger.entity';
import { User } from '@modules/core/entities/user.entity';
import { Booking } from '@modules/core/entities/booking.entity';
import { PassengerController } from './controllers/passanger.controller';
import { PassengerService } from './services/passanger.service';



@Module({
  imports: [
    TypeOrmModule.forFeature([Passenger, User, Booking]),
  ],
  controllers: [PassengerController],
  providers: [PassengerService],
  exports: [PassengerService],  // exported so AuthModule can call ensureProfile()
})
export class PassengerModule {}