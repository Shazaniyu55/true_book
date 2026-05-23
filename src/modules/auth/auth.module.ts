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

@Module({
  imports: [
    TypeOrmModule.forFeature([ User, Driver, Passenger, Admin]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('common.auth.jwt.accessSecret'),
        signOptions: { expiresIn: configService.get<string>('common.auth.jwt.accessExpiresIn') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    Broker,
    AuthService,
    JwtStrategy,
    UserRepository,
    DriverRepository,
    PassengerRepository,
     {
          provide: HashingUtil,
          useClass: BcryptHashingUtil,
    },
    RandomnessUtil,
    RegisterUsecase,
    LoginUsecase,
    VerifyOtpUsecase,
    ForgotPasswordUsecase,
    ResetPasswordUsecase,
  ],
  exports: [AuthService, UserRepository],
})
export class AuthModule {}
