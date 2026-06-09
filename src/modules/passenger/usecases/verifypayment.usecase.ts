import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PaymentService } from '../services/payment.service';

@Injectable()
export class VerifyPaymentUsecase extends Usecase {
  constructor(private readonly paymentService: PaymentService) {
    super();
  }

  async execute(
    em: EntityManager,
    args: { reference: string; channel: string; paidAt?: string; card?: any[] },
  ) {
    return this.paymentService.verifyPayment(args.reference, args.channel, args.paidAt, args.card, em);
  }
}