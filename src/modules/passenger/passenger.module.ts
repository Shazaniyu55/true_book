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
import { InitiatePaymentUsecase } from './usecases/initiatepayment.usecase';
import { GetBankListUsecase } from './usecases/getbanklist.usecase';
import { CouponReferralModule } from '@modules/coupon-referral/cupon.module';
import { Payment } from '@modules/core/entities/payment.entity';
import { Trip } from '@modules/core/entities/trip.entity';
import { Driver } from '@modules/core/entities/driver.entity';
import { PaymentService } from './services/payment.service';
import { PaymentFactory } from '@adapters/payment/payment.factory';
import { PaystackAdapter } from '@adapters/payment/paystack/paystack.adapter';
import { PaystackProvider } from '@adapters/payment/paystack/providers/paystack.provider';
import { FlutterwaveAdapter } from '@adapters/payment/flutterwave/flutterwave.adapter';
import { FlutterwaveProvider } from '@adapters/payment/flutterwave/providers/flutterwave.provider';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { BookingIntent } from '@modules/core/entities/booking_intent.entity';



@Module({
  imports: [
    CloudinaryModule,
    CouponReferralModule,
    TypeOrmModule.forFeature([Passenger, User, Booking, Payment, Trip, Driver, BookingIntent
    ]),
  ],
  controllers: [PassengerController],
  providers: [
    Broker,
    PassengerService,
    PaymentService,
    PassengerRepository,
    PaymentFactory,
    PaystackAdapter,
    PaystackProvider,
    FlutterwaveAdapter,
    FlutterwaveProvider,
    RandomnessUtil,
    GetPassengerProfileUsecase,
    DeleteUserAccountUsecase,
    GetPassengerDashBoardUsecase,
    InitiatePaymentUsecase,
    GetBankListUsecase
  
  ],
  exports: [PassengerService, PassengerRepository, PaymentService],  // exported so AuthModule can call ensureProfile()
})
export class PassengerModule {}