import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@modules/core/entities/user.entity';
import { Driver } from '@modules/core/entities/driver.entity';
import { Trip } from '@modules/core/entities/trip.entity';
import { Booking } from '@modules/core/entities/booking.entity';
import { Payout } from '@modules/core/entities/payout.entity';
import { DocumentVerification } from '@modules/core/entities/document-verification.entity';
import { Coupon } from '@modules/core/entities/coupon.entity';
import { Passenger } from '@modules/core/entities/passenger.entity';
import { PaystackAdapter } from '@adapters/payment/paystack/paystack.adapter';
import { PaystackProvider } from '@adapters/payment/paystack/providers/paystack.provider';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { Broker } from '@broker/broker';
import { AdminService } from './services/admin.service';
import { AdminController } from './controllers/admin.controller';
import { Admin } from '@modules/core/entities/admin.entity';
import { Role } from '@modules/core/entities/role.entity';
import { AdminRepository } from '@adapters/repositories/admin.repository';
import { UserRepository } from '@adapters/repositories/user.repository';
import { JwtModule } from '@nestjs/jwt/dist/jwt.module';
import { BcryptHashingUtil } from '@shared/utils/hashing/bcrypt.utils';
import { RegisterAdminUsecase } from './usecases/create.usecase';
import { LoginAdminUsecase } from './usecases/login.usecase';
import { HashingUtil } from '@shared/utils/hashing/hashing.utils';
import { ConfigModule, ConfigService } from '@nestjs/config';

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
            signOptions: { expiresIn: configService.get<string>('common.auth.jwt.accessExpiresIn') },
          }),
        }),
  ],
  controllers: [AdminController],
  providers: [
    Broker,
    //service
    AdminService,

    //repository
    AdminRepository,
    UserRepository,
    //usecase
    RegisterAdminUsecase,
    LoginAdminUsecase,
    //adapters
    PaystackAdapter,
    PaystackProvider,
     {
      provide: HashingUtil,
      useClass: BcryptHashingUtil,
    },
    RandomnessUtil,
  ],
  exports: [AdminService, AdminRepository, UserRepository],
})
export class AdminModule {}
