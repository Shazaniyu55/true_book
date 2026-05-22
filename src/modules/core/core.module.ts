import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { Driver } from './entities/driver.entity';
import { Passenger } from './entities/passenger.entity';
import { Agent } from './entities/agent.entity';
import { Vehicle } from './entities/vehicle.entity';
import { Trip } from './entities/trip.entity';
import { Booking } from './entities/booking.entity';
import { Notification } from './entities/notification.entity';
import { DocumentVerification } from './entities/document-verification.entity';
import { Payout } from './entities/payout.entity';
import { Coupon } from './entities/coupon.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Driver,
      Passenger,
      Agent,
      Vehicle,
      Trip,
      Booking,
      Notification,
      DocumentVerification,
      Payout,
      Coupon,
    ]),
  ],
  providers: [],
  exports: [],
})
export class CoreModule {}
