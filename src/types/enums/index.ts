export enum UserRole {
  PASSENGER = 'passenger',
  DRIVER = 'driver',
  ADMIN = 'admin',
  AGENT = 'agent',
}

export enum PermissionLevel {
  READ = 'read',
  WRITE = 'write',
  FULL = 'full',
}


export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export enum TripStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  CLOSED = 'closed',
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  REFUNDED = 'refunded',
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentGateway {
  PAYSTACK = 'paystack',
  FLUTTERWAVE = 'flutterwave',
}

export enum PayoutStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DECLINED = 'declined',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
}

export enum DocumentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum KycStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum VehicleType {
  BUS = 'bus',
  MINI_BUS = 'mini_bus',
  CAR = 'car',
  HIACE = 'hiace',
  COASTER = 'coaster',
}

export enum NotificationType {
  TRIP_BOOKED = 'trip_booked',
  TRIP_CANCELLED = 'trip_cancelled',
  TRIP_COMPLETED = 'trip_completed',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  PAYOUT_APPROVED = 'payout_approved',
  PAYOUT_DECLINED = 'payout_declined',
  DOCUMENT_APPROVED = 'document_approved',
  DOCUMENT_REJECTED = 'document_rejected',
  BROADCAST = 'broadcast',
  OTP = 'otp',
}

export enum CouponType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
  WELCOME = 'welcome',
  REFERRAL = 'referral',
}

export enum CouponStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  REFUND = 'refund',
  PAYOUT = 'payout',
}

export enum AppPlatform {
  ANDROID = 'android',
  IOS = 'ios',
}
