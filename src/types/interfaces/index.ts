import { UserRole } from '../enums';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface PaymentInitiatePayload {
  amount: number;
  email: string;
  reference: string;
  callback_url?: string;
  metadata?: Record<string, any>;
}

export interface PaymentVerifyResponse {
  status: boolean;
  reference: string;
  amount: number;
  gateway_response: string;
  paid_at: string;
  channel: string;
  currency: string;
  customer: { email: string; name?: string };
}

export interface PayoutPayload {
  account_number: string;
  bank_code: string;
  amount: number;
  reason?: string;
  recipient_code?: string;
}

export interface BankListItem {
  name: string;
  code: string;
  slug: string;
}

export interface NameEnquiryResponse {
  account_name: string;
  account_number: string;
  bank_code: string;
}

export interface DojahVerifyBvnPayload { bvn: string; selfie_image?: string; }
export interface DojahVerifyNinPayload { nin: string; }
export interface DojahVerifyLicensePayload {
  license_number: string;
  date_of_birth: string;
  first_name: string;
  last_name: string;
}
export interface DojahVerificationResult {
  entity: Record<string, any>;
  status: boolean;
  message: string;
}

export interface WebhookEvent { event: string; data: Record<string, any>; }
export interface PaystackWebhookEvent extends WebhookEvent {
  event: 'charge.success' | 'transfer.success' | 'transfer.failed' | 'transfer.reversed' | 'refund.processed';
}
export interface DojahWebhookEvent extends WebhookEvent {
  event: 'kyc.completed' | 'kyc.failed' | 'verification.complete';
}

export interface IPaymentAdapter {
  initiatePayment(payload: PaymentInitiatePayload): Promise<{ authorization_url: string; access_code: string; reference: string }>;
  verifyPayment(reference: string): Promise<PaymentVerifyResponse>;
  getBankList(): Promise<BankListItem[]>;
  nameEnquiry(account_number: string, bank_code: string): Promise<NameEnquiryResponse>;
}
