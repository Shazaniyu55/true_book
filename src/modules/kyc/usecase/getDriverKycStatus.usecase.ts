import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { KycService } from '../service/kyc.service';

@Injectable()
export class GetDriverKycStatusUsecase extends Usecase {
  constructor(private readonly kycService: KycService) {
    super();
  }

  async execute(_entityManager: EntityManager, args: { id: string }) {
    return this.kycService.getDriverKycStatus(args.id);
  }
}