import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PayoutService } from '../services/payout.service';
import { InitiatePayoutDto } from '../dtos/payout.dto';

@Injectable()
export class InitiatePayoutUsecase extends Usecase {
  constructor(private readonly payoutService: PayoutService) { super(); }
  async execute(_em: EntityManager, args: { id: string; dto: InitiatePayoutDto }) {
    return this.payoutService.initiatePayout(args.id, args.dto);
  }
}