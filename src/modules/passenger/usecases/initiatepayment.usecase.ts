import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PaymentService } from '../services/payment.service';
import { InitiatePaymentDto } from '../dtos/passanger.dto';

@Injectable()
export class InitiatePaymentUsecase extends Usecase {
  constructor(private readonly paymentService: PaymentService) {
    super();
  }

  async execute(_em: EntityManager, args: { id: string; dto: InitiatePaymentDto }) {
    return this.paymentService.initiatePayment(args.id, args.dto);
  }
}