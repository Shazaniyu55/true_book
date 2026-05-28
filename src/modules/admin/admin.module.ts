import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt/dist/jwt.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { User } from '@modules/core/entities/user.entity';
import { Driver } from '@modules/core/entities/driver.entity';
import { Trip } from '@modules/core/entities/trip.entity';
import { Booking } from '@modules/core/entities/booking.entity';
import { Payout } from '@modules/core/entities/payout.entity';
import { DocumentVerification } from '@modules/core/entities/document-verification.entity';
import { Coupon } from '@modules/core/entities/coupon.entity';
import { Passenger } from '@modules/core/entities/passenger.entity';
import { Admin } from '@modules/core/entities/admin.entity';
import { Role } from '@modules/core/entities/role.entity';

import { PaystackAdapter } from '@adapters/payment/paystack/paystack.adapter';
import { PaystackProvider } from '@adapters/payment/paystack/providers/paystack.provider';
import { AdminRepository } from '@adapters/repositories/admin.repository';
import { UserRepository } from '@adapters/repositories/user.repository';

import { Broker } from '@broker/broker';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { BcryptHashingUtil } from '@shared/utils/hashing/bcrypt.utils';
import { HashingUtil } from '@shared/utils/hashing/hashing.utils';

import { AdminService } from './services/admin.service';
import { AdminController } from './controllers/admin.controller';

// ─── Auth Usecases ───────────────────────────────────────────────────────────
import { RegisterAdminUsecase } from './usecases/create.usecase';
import { LoginAdminUsecase } from './usecases/login.usecase';

// ─── Dashboard ───────────────────────────────────────────────────────────────
import { GetDashboardUsecase } from './usecases/getdashboard.usecase';

// ─── Users ───────────────────────────────────────────────────────────────────
import { ListUsersUsecase } from './usecases/listuser.usecase';
import { GetUserUsecase } from './usecases/getuser.usecase';
import { SuspendUserUsecase } from './usecases/suspenduser.usecase';
import { ActivateUserUsecase } from './usecases/activateuser.usecase';

// ─── Documents ───────────────────────────────────────────────────────────────
import {
  ApproveDocumentUsecase,
  ListPendingDocumentsUsecase,
  RejectDocumentUsecase,
} from './usecases/document.usecase';

// ─── Trips ───────────────────────────────────────────────────────────────────
import { GetTripUsecase, ListTripsUsecase } from './usecases/trip.usecase';

// ─── Bookings ────────────────────────────────────────────────────────────────
import {
  GetBookingUsecase,
  ListBookingsUsecase,
  RefundBookingUsecase,
} from './usecases/booking.usecase';

// ─── Payouts ─────────────────────────────────────────────────────────────────
import {
  ApprovePayoutUsecase,
  DeclinePayoutUsecase,
  ListPayoutsUsecase,
} from './usecases/payout.usecase';

// ─── Coupons ─────────────────────────────────────────────────────────────────
import {
  CreateCouponUsecase,
  DeactivateCouponUsecase,
  ListCouponsUsecase,
} from './usecases/cupons.usecase';
import { VerifyAdminOtpUsecase } from './usecases/verifyadminotp.usecase';



const USECASES = [
  // Auth
  RegisterAdminUsecase,
  LoginAdminUsecase,
  // Dashboard
  GetDashboardUsecase,
  // Users
  ListUsersUsecase,
  GetUserUsecase,
  SuspendUserUsecase,
  ActivateUserUsecase,
  VerifyAdminOtpUsecase,
  // Documents
  ListPendingDocumentsUsecase,
  ApproveDocumentUsecase,
  RejectDocumentUsecase,
  // Trips
  ListTripsUsecase,
  GetTripUsecase,
  // Bookings
  ListBookingsUsecase,
  GetBookingUsecase,
  RefundBookingUsecase,
  // Payouts
  ListPayoutsUsecase,
  ApprovePayoutUsecase,
  DeclinePayoutUsecase,
  // Coupons
  ListCouponsUsecase,
  CreateCouponUsecase,
  DeactivateCouponUsecase,
];




@Module({
  imports: [
    TypeOrmModule.forFeature([
      Admin,
      Role,
      User,
      Driver,
      Trip,
      Booking,
      Payout,
      DocumentVerification,
      Coupon,
      Passenger,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('common.auth.jwt.accessSecret'),
        signOptions: {
          expiresIn: configService.get<string>('common.auth.jwt.accessExpiresIn'),
        },
      }),
    }),
  ],
  controllers: [AdminController],
  providers: [
    Broker,
    AdminService,
    AdminRepository,
    UserRepository,
    PaystackAdapter,
    PaystackProvider,
    { provide: HashingUtil, useClass: BcryptHashingUtil },
    RandomnessUtil,
    ...USECASES,
  ],
  exports: [AdminService, AdminRepository, UserRepository],
})
export class AdminModule {}