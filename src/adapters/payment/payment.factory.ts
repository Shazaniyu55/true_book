import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaystackAdapter } from './paystack/paystack.adapter';
import { FlutterwaveAdapter } from './flutterwave/flutterwave.adapter';
import { BankListItem, NameEnquiryResponse, PaymentInitiatePayload, PaymentVerifyResponse } from '../../types/interfaces';

enum PaymentGatewayEnum {
  PAYSTACK = 'paystack',
  FLUTTERWAVE = 'flutterwave',
}

@Injectable()
export class PaymentFactory {
  private readonly logger = new Logger(PaymentFactory.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly paystackAdapter: PaystackAdapter,
    private readonly flutterwaveAdapter: FlutterwaveAdapter,
  ) {}

  private getProvider() {
    const gateway = this.configService.get<string>('common.payment.gateway') || PaymentGatewayEnum.PAYSTACK;
    switch (gateway) {
      case PaymentGatewayEnum.FLUTTERWAVE:
        return this.flutterwaveAdapter;
      case PaymentGatewayEnum.PAYSTACK:
      default:
        return this.paystackAdapter;
    }
  }

  initiatePayment(payload: PaymentInitiatePayload) {
    return this.getProvider().initiatePayment(payload);
  }

  verifyPayment(reference: string): Promise<PaymentVerifyResponse> {
    return this.getProvider().verifyPayment(reference);
  }

  getBankList(): Promise<BankListItem[]> {
    return this.getProvider().getBankList();
  }

  nameEnquiry(account_number: string, bank_code: string): Promise<NameEnquiryResponse> {
    return this.getProvider().nameEnquiry(account_number, bank_code);
  }
}
