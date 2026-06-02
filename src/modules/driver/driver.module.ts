import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Entities
import { Trip } from '@modules/core/entities/trip.entity';
import { Driver } from '@modules/core/entities/driver.entity';
import { Booking } from '@modules/core/entities/booking.entity';
import { Passenger } from '@modules/core/entities/passenger.entity';
import { Escrow } from '@modules/core/entities/escro.entity';
import { Coupon } from '@modules/core/entities/coupon.entity';
import { Notification } from '@modules/core/entities/notification.entity';
import { Vehicle } from '@modules/core/entities/vehicle.entity';

// Controllers


// Use Cases


// Shared Dependencies
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { PaymentFactory } from '@adapters/payment/payment.factory';
import { ExpoService } from '@modules/notification/services/expo.service';
import { DriverTripController } from './controllers/driver.controller';
import { DriverTripService } from './services/driver.service';
import { TripsService } from '@modules/trip/service/trip.service';
import { PaystackAdapter } from '@adapters/payment/paystack/paystack.adapter';
import { FlutterwaveProvider } from '@adapters/payment/flutterwave/providers/flutterwave.provider';
import { PaystackProvider } from '@adapters/payment/paystack/providers/paystack.provider';
import { FlutterwaveAdapter } from '@adapters/payment/flutterwave/flutterwave.adapter';
import { Broker } from '@broker/broker';
import { TripsModule } from '@modules/trip/trip.module';
import { CreateDriverTripUsecase } from './usecases/createTrip.usecase';
import { UpdateDriverTripUsecase } from './usecases/updateTrip.usecase';
import { ActivateDriverTripUsecase } from './usecases/activatetrip.usecase';
import { CancleDriverTripUsecase } from './usecases/cancletrip.usecase';
import { CompleteDriverTripUsecase } from './usecases/completetrip.usecase';
import { GetTripBookingsUsecase } from '@modules/trip/usecases/gettripbookings.usecase';
import { CheckInPassengerUsecase } from '@modules/trip/usecases/checkinpassenger.usecase';
import { GetTripUsecase } from '@modules/trip/usecases/gettrip.usecase';
import { GetMyTripUsecase } from '@modules/trip/usecases/getmytrip.usecase';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DRIVER TRIP MODULE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Orchestrates driver trip management features:
 * - Create, update, activate, cancel, complete trips
 * - Trip bookings and passenger management
 * - Escrow and payment handling
 */

@Module({
  imports: [
    ConfigModule,
    TripsModule,
    TypeOrmModule.forFeature([
      Trip,
      Driver,
      Booking,
      Passenger,
      Escrow,
      Coupon,
      Notification,
      Vehicle,
    ]),
  ],
  controllers: [DriverTripController],
  providers: [
    Broker,
    // Services
    DriverTripService,
    TripsService,

    // Use Cases
    CreateDriverTripUsecase,
    UpdateDriverTripUsecase,
    ActivateDriverTripUsecase,
    CancleDriverTripUsecase,
    CompleteDriverTripUsecase,
    GetTripBookingsUsecase,
    CheckInPassengerUsecase,
    GetTripUsecase,
    GetMyTripUsecase,


    // Shared Dependencies
    RandomnessUtil,
    PaymentFactory,
    ExpoService,
    PaystackAdapter,
    PaystackProvider,
    FlutterwaveAdapter,
    FlutterwaveProvider,


  ],
  exports: [DriverTripService, TripsService],
})
export class DriverModule {}