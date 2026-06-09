import { Injectable, Logger } from '@nestjs/common';
import { IPaystack } from './paystack.interface';
import { PaystackProvider } from './providers/paystack.provider';
import {
  BankListItem,
  NameEnquiryResponse,
  PaymentInitiatePayload,
  PaymentVerifyResponse,
  PayoutPayload,
} from '../../../types/interfaces';

@Injectable()
export class PaystackAdapter implements IPaystack {
  private readonly logger = new Logger(PaystackAdapter.name);
  private readonly provider: IPaystack;

  constructor(private readonly paystackProvider: PaystackProvider) {
    this.provider = this.paystackProvider;
  }

  initiatePayment(payload: PaymentInitiatePayload) {
    return this.provider.initiatePayment(payload);
  }

  verifyPayment(reference: string): Promise<PaymentVerifyResponse> {
    return this.provider.verifyPayment(reference);
  }

  createTransferRecipient(payload: {
    name: string;
    account_number: string;
    bank_code: string;
    currency?: string;
  }) {
    return this.provider.createTransferRecipient(payload);
  }

  initiatePayout(payload: PayoutPayload) {
    return this.provider.initiatePayout(payload);
  }

  getBankList(): Promise<BankListItem[]> {
    return this.provider.getBankList();
  }

  nameEnquiry(account_number: string, bank_code: string): Promise<NameEnquiryResponse> {
    return this.provider.nameEnquiry(account_number, bank_code);
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    return this.provider.verifyWebhookSignature(payload, signature);
  }

  initiateRefund(reference: string, amount?: number): Promise<boolean> {
  return this.provider.initiateRefund(reference, amount);
}

checkBalance(): Promise<{ balance: number; currency: string }> {
  return this.provider.checkBalance();
}
  
}
