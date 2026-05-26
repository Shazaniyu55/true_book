import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { Trip } from '@modules/core/entities/trip.entity';
import { Booking } from '@modules/core/entities/booking.entity';
import { Driver } from '@modules/core/entities/driver.entity';
import { Passenger } from '@modules/core/entities/passenger.entity';
import { Coupon } from '@modules/core/entities/coupon.entity';
import { Notification } from '@modules/core/entities/notification.entity';
import { Vehicle } from '@modules/core/entities/vehicle.entity';

import { PaymentFactory } from '@adapters/payment/payment.factory';
import { PaystackAdapter } from '@adapters/payment/paystack/paystack.adapter';
import { PaystackProvider } from '@adapters/payment/paystack/providers/paystack.provider';
import { FlutterwaveAdapter } from '@adapters/payment/flutterwave/flutterwave.adapter';
import { FlutterwaveProvider } from '@adapters/payment/flutterwave/providers/flutterwave.provider';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { ExpoService } from '@modules/notification/services/expo.service';
import { Broker } from '@broker/broker';
import { Escrow } from '@modules/core/entities/escro.entity';
import { TripsController } from './controllers/trip.controller';
import { TripsService } from './service/trip.service';



@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Trip,
      Booking,
      Driver,
      Passenger,
      Escrow,
      Coupon,
      Notification,
      Vehicle,
    ]),
  ],
  controllers: [TripsController],
  providers: [
    Broker,
    TripsService,
    PaymentFactory,
    PaystackAdapter,
    PaystackProvider,
    FlutterwaveAdapter,
    FlutterwaveProvider,
    RandomnessUtil,
    ExpoService,
  ],
  exports: [TripsService],
})
export class TripsModule {}