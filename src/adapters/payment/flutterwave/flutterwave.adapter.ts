import { Injectable, Logger } from '@nestjs/common';
import { IFlutterwave } from './flutterwave.interface';
import { FlutterwaveProvider } from './providers/flutterwave.provider';
import { BankListItem, NameEnquiryResponse, PaymentInitiatePayload, PaymentVerifyResponse } from '../../../types/interfaces';

@Injectable()
export class FlutterwaveAdapter implements IFlutterwave {
  private readonly logger = new Logger(FlutterwaveAdapter.name);

  constructor(private readonly flutterwaveProvider: FlutterwaveProvider) {}

  initiatePayment(payload: PaymentInitiatePayload) {
    return this.flutterwaveProvider.initiatePayment(payload);
  }

  verifyPayment(transaction_id: string): Promise<PaymentVerifyResponse> {
    return this.flutterwaveProvider.verifyPayment(transaction_id);
  }

  getBankList(): Promise<BankListItem[]> {
    return this.flutterwaveProvider.getBankList();
  }

  nameEnquiry(account_number: string, bank_code: string): Promise<NameEnquiryResponse> {
    return this.flutterwaveProvider.nameEnquiry(account_number, bank_code);
  }

  initiatePayout(payload: { account_number: string; bank_code: string; amount: number; narration?: string; account_name: string; reference: string }) {
    return this.flutterwaveProvider.initiatePayout(payload);
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    return this.flutterwaveProvider.verifyWebhookSignature(payload, signature);
  }
}
