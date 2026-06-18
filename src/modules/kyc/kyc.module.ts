import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Driver } from '@modules/core/entities/driver.entity';
import { Passenger } from '@modules/core/entities/passenger.entity';
import { DocumentVerification } from '@modules/core/entities/document-verification.entity';

import { DojahAdapter } from '@adapters/kyc/dojah/dojah.adapter';
import { DojahProvider } from '@adapters/kyc/dojah/providers/dojah.provider';

import { KycController } from './controller/kyc.controller';
import { KycService } from './service/kyc.service';
import { CloudinaryModule } from '@modules/cloudinary/cloudinary.module';
import { User } from '@modules/core/entities/user.entity';
import { RandomnessUtil } from '@shared/utils/encryption/randomness.util';
import { Broker } from '@broker/broker';
import { GetDriverKycStatusUsecase } from './usecase/getDriverKycStatus.usecase';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { LICENSE_QUEUE } from './dtos/kyc.queue';
import { LicenseProcessor } from './dtos/license.processor';
import { Vehicle } from '@modules/core/entities/vehicle.entity';

@Module({
  imports: [
    ConfigModule,
    CloudinaryModule,
    TypeOrmModule.forFeature([Driver, Passenger, DocumentVerification, User, Vehicle]),
     BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('common.redis.host', 'localhost'),
          port: config.get<number>('common.redis.port', 6379),
          password: config.get<string>('common.redis.password') || undefined,
          db: config.get<number>('common.redis.db', 0),
        },
      }),
    }),
    BullModule.registerQueue({ name: LICENSE_QUEUE }),
  
  ],
  controllers: [KycController],
  providers: [
    Broker, 
    KycService, 
    DojahAdapter, 
    DojahProvider, 
    RandomnessUtil,

    GetDriverKycStatusUsecase,
    LicenseProcessor

  
  ],
  exports: [KycService],
})
export class KycModule {}