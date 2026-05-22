import { BankListItem, NameEnquiryResponse, PaymentInitiatePayload, PaymentVerifyResponse } from '../../../types/interfaces';

export interface IFlutterwave {
  initiatePayment(payload: PaymentInitiatePayload): Promise<{ authorization_url: string; access_code: string; reference: string }>;
  verifyPayment(transaction_id: string): Promise<PaymentVerifyResponse>;
  getBankList(): Promise<BankListItem[]>;
  nameEnquiry(account_number: string, bank_code: string): Promise<NameEnquiryResponse>;
  initiatePayout(payload: { account_number: string; bank_code: string; amount: number; narration?: string; account_name: string; reference: string }): Promise<{ transfer_code: string; status: string }>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
}
