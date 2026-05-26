import {
  BankListItem,
  NameEnquiryResponse,
  PaymentInitiatePayload,
  PaymentVerifyResponse,
  PayoutPayload,
} from '../../../types/interfaces';

export interface IPaystack {
  initiatePayment(payload: PaymentInitiatePayload): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }>;
  verifyPayment(reference: string): Promise<PaymentVerifyResponse>;
  createTransferRecipient(payload: {
    name: string;
    account_number: string;
    bank_code: string;
    currency?: string;
  }): Promise<{ recipient_code: string }>;
  initiatePayout(payload: PayoutPayload): Promise<{ transfer_code: string; status: string }>;
  getBankList(): Promise<BankListItem[]>;
  nameEnquiry(account_number: string, bank_code: string): Promise<NameEnquiryResponse>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
  initiateRefund(reference: string, amount?: number): Promise<boolean>;
}
