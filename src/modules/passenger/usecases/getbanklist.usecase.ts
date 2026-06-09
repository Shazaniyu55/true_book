import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PaymentService } from '../services/payment.service';

@Injectable()
export class GetBankListUsecase extends Usecase {
  constructor(private readonly paymentService: PaymentService) {
    super();
  }

  async execute(_em: EntityManager, _args: any) {
    return this.paymentService.getBankList();
  }
}