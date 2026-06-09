import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookController } from './controllers/webhook.controller';
import { Booking } from '@modules/core/entities/booking.entity';
import { Escrow } from '@modules/core/entities/escro.entity';
import { DocumentVerification } from '@modules/core/entities/document-verification.entity';
import { Notification } from '@modules/core/entities/notification.entity';
import { Driver } from '@modules/core/entities/driver.entity';
import { Passenger } from '@modules/core/entities/passenger.entity';
import { Trip } from '@modules/core/entities/trip.entity';
import { Coupon } from '@modules/core/entities/coupon.entity';
import { Vehicle } from '@modules/core/entities/vehicle.entity';

import { PaystackAdapter } from '@adapters/payment/paystack/paystack.adapter';
import { PaystackProvider } from '@adapters/payment/paystack/providers/paystack.provider';
import { FlutterwaveAdapter } from '@adapters/payment/flutterwave/flutterwave.adapter';
import { FlutterwaveProvider } from '@adapters/payment/flutterwave/providers/flutterwave.provider';
import { PaymentFactory } from '@adapters/payment/payment.factory';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { ExpoService } from '@modules/notification/services/expo.service';
import { TripsModule } from '@modules/trip/trip.module';
import { PassengerModule } from '@modules/passenger/passenger.module';
import { DriverModule } from '@modules/driver/driver.module';
import { PaymentService } from '@modules/passenger/services/payment.service';
import { PayoutService } from '@modules/driver/services/payout.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      Escrow,
      DocumentVerification,
      Notification,
      Driver,
      Passenger,
      Trip,
      Coupon,
      Vehicle,
    ]),
    TripsModule,  
  PassengerModule,   
  DriverModule
  ],
  controllers: [WebhookController],
  providers: [
    PaystackAdapter,      
    PaystackProvider,     
    FlutterwaveAdapter,
    FlutterwaveProvider,
    PaymentFactory,
    RandomnessUtil,
    ExpoService,
  ],
  
})
export class WebhookModule {}