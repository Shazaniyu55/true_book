// src/types/interfaces/index.ts

import { Request } from 'express';
import { UserRole } from '../enums';

// ─── Auth / Request ───────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T = any> {
  status: 'success' | 'failed';
  message: string;
  data?: T;
}

export interface PaginatedResponse<T = any> {
  status: 'success';
  message: string;
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number;
  to: number;
}

export interface PaginationQuery {
  page?: number;
  per_page?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

// ─── Payment ──────────────────────────────────────────────────────────────────

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
  customer: {
    email: string;
    name?: string;
  };
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

// ─── KYC / Dojah ─────────────────────────────────────────────────────────────

export interface DojahVerifyBvnPayload {
  bvn: string;
  selfie_image?: string;
}

export interface DojahVerifyNinPayload {
  nin: string;
}

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

// ─── Notification ─────────────────────────────────────────────────────────────

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  user_id: string;
  type: string;
}

export interface PushNotificationPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface MailPayload {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, any>;
}

// ─── Webhook ──────────────────────────────────────────────────────────────────

export interface WebhookEvent {
  event: string;
  data: Record<string, any>;
}

export interface PaystackWebhookEvent extends WebhookEvent {
  event:
    | 'charge.success'
    | 'transfer.success'
    | 'transfer.failed'
    | 'transfer.reversed'
    | 'refund.processed';
}

export interface DojahWebhookEvent extends WebhookEvent {
  event: 'kyc.completed' | 'kyc.failed' | 'verification.complete';
}

// ─── Trip & Booking ───────────────────────────────────────────────────────────

export interface TripSearchFilters {
  origin?: string;
  destination?: string;
  departure_date?: string;
  vehicle_type?: string;
  min_price?: number;
  max_price?: number;
  available_seats?: number;
}

export interface QrScanPayload {
  booking_code: string;
  trip_id: string;
}

// ─── File Upload ──────────────────────────────────────────────────────────────

export interface UploadedFileResult {
  url: string;
  path: string;
  filename: string;
  size: number;
  mime_type: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface AppConfig {
  name: string;
  env: string;
  port: number;
  url: string;
  debug: boolean;
  otp_duration: number;
}

export interface DatabaseConfig {
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface JwtConfig {
  secret: string;
  expiration: string;
  refresh_secret: string;
  refresh_expiration: string;
}

export interface PaymentConfig {
  gateway: string;
  paystack: {
    base_url: string;
    secret_key: string;
    public_key: string;
  };
  flutterwave: {
    public_key: string;
    secret_key: string;
    encryption_key: string;
  };
}
