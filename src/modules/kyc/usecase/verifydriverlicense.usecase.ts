import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { KycService } from '../service/kyc.service';
import { VerifyDriverLicenseDto } from '../dtos/kyc.dto';

@Injectable()
export class VerifyDriverLicenseUsecase extends Usecase {
  constructor(private readonly kycService: KycService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { id: string, dto:VerifyDriverLicenseDto }) {
    return this.kycService.verifyDriverLicense(args.id, args.dto);
  }
}