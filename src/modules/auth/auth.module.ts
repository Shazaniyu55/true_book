import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { User } from '@modules/core/entities/user.entity';
import { Driver } from '@modules/core/entities/driver.entity';
import { Passenger } from '@modules/core/entities/passenger.entity';
import { UserRepository } from '@adapters/repositories/user.repository';
import { DriverRepository } from '@adapters/repositories/driver.repository';
import { PassengerRepository } from '@adapters/repositories/passenger.repository';
import { Broker } from '@broker/broker';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RegisterUsecase } from './usecases/register.usecase';
import { LoginUsecase } from './usecases/login.usecase';
import { VerifyOtpUsecase } from './usecases/verify-otp.usecase';
import { ForgotPasswordUsecase } from './usecases/forgot-password.usecase';
import { ResetPasswordUsecase } from './usecases/reset-password.usecase';
import { BcryptHashingUtil } from '@shared/utils/hashing/bcrypt.utils';
import { HashingUtil } from '@shared/utils/hashing/hashing.utils';
import { Admin } from '@modules/core/entities/admin.entity';
import { ExpoService } from '@modules/notification/services/expo.service';
import { BookingRepository } from '@adapters/repositories/booking.repository';
import { Booking } from '@modules/core/entities/booking.entity';
import { ResendOtpUsecase } from './usecases/resendotp.usecase';
import { CouponReferralModule } from '@modules/coupon-referral/cupon.module';
import { Role } from '@modules/core/entities/role.entity';
import { DojahAdapter } from '@adapters/kyc/dojah/dojah.adapter';
import { DojahProvider } from '@adapters/kyc/dojah/providers/dojah.provider';
import { VerifyPhoneOtpUsecase } from './usecases/verifyphone-otp.usecase';
import { ResendPhoneOtpUsecase } from './usecases/resendphoneotp.usecase';
import { AdminModule } from '@modules/admin/admin.module';
import { RegisterAdminUsecase } from './usecases/createadmin.usecase';
import { LoginAdminUsecase } from './usecases/loginadmin.usecase';
import { VerifyAdminOtpUsecase } from './usecases/verifyadminotp.usecase';
import { AgentRepository } from '@adapters/repositories/agent.repository';
import { Agent } from '@modules/core/entities/agent.entity';
import { VehicleType } from '@modules/core/entities/vehicletype.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ Agent, User, Driver, Passenger, Admin, VehicleType, Booking, Role]),
    PassportModule,
    AdminModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('common.auth.jwt.accessSecret'),
        signOptions: { expiresIn: configService.get<string>('common.auth.jwt.accessExpiresIn') },
      }),
    }),
    CouponReferralModule
  ],
  controllers: [AuthController],
  providers: [
    Broker,
    AuthService,
    ExpoService,
    JwtStrategy,
    UserRepository,
    DriverRepository,
    PassengerRepository,
    AgentRepository,
    DojahAdapter,
    DojahProvider,
     {
          provide: HashingUtil,
          useClass: BcryptHashingUtil,
    },
    RandomnessUtil,
    RegisterUsecase,
    LoginUsecase,
    RegisterAdminUsecase,
    LoginAdminUsecase,
    VerifyAdminOtpUsecase,
    VerifyOtpUsecase,
    VerifyPhoneOtpUsecase,
    ForgotPasswordUsecase,
    ResetPasswordUsecase,
    ResendOtpUsecase,
    ResendPhoneOtpUsecase,
    BookingRepository
  ],
  exports: [AuthService, UserRepository],
})
export class AuthModule {}
