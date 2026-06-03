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
import { VerifyDriverLicenseUsecase } from './usecase/verifydriverlicense.usecase';
// import { VerifyDriverNinUsecase } from './usecase/verifyDriverNin.usecase';
// import { VerifyDriverBvnUsecase } from './usecase/verifyDriverBvn.usecase';

@Module({
  imports: [
    ConfigModule,
    CloudinaryModule,
    TypeOrmModule.forFeature([Driver, Passenger, DocumentVerification, User]),
  ],
  controllers: [KycController],
  providers: [
    Broker, 
    KycService, 
    DojahAdapter, 
    DojahProvider, 
    RandomnessUtil,

    GetDriverKycStatusUsecase,
    VerifyDriverLicenseUsecase,
    // VerifyDriverNinUsecase,
    // VerifyDriverBvnUsecase
  
  ],
  exports: [KycService],
})
export class KycModule {}