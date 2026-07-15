export enum UserRole {
  PASSENGER = 'passenger',
  DRIVER = 'driver',
  ADMIN = 'admin',
  AGENT = 'agent',
  GUEST = 'guest',
}

export enum PermissionLevel {
  READ = 'read',
  WRITE = 'write',
  FULL = 'full',
}

export enum TicketStatus {
  PENDING = 'pending',   // booking created, payment not confirmed
  ISSUED = 'issued',     // paid → QR ticket is live
  SCANNED = 'scanned',   // boarded + driver credited
  VOID = 'void',         // cancelled / refunded
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export enum TripStatus {
  PENDING = 'upcoming',
  ACTIVE = 'active',
  STARTED = 'started',
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
  TRIP_CREATED= 'trip_created',
  TRIP_BOOKED = 'trip_booked',
  TRIP_STARTED = 'trip_started',
  TRIP_CANCELLED = 'trip_cancelled',
  TRIP_COMPLETED = 'trip_completed',
  BOOKING_VERIFIED = 'booking_verified',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  PAYOUT_APPROVED = 'payout_approved',
  PAYOUT_DECLINED = 'payout_declined',
  DOCUMENT_APPROVED = 'document_approved',
  DOCUMENT_REJECTED = 'document_rejected',
  BROADCAST = 'broadcast',
  ANNOUNCEMENT = 'announcement',
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

export enum ContactSupportStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum EscrowStatus {
  HELD = 'held',
  RELEASED = 'released',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed',
}

export interface PriceControlDto {
  agentEarningAmount: number;     // max an agent can earn per referred driver
  platformCommissionRate: number; // % platform takes per booking
  driverEarningRate: number;      // % driver earns per booking
  minTripPrice: number;           // minimum price for a trip
  maxTripPrice: number;           // maximum price for a trip
}

export interface ReferralProgramDto {
  earningPerTrip: number;         // how much agent earns per completed trip
  maxEarningPerDriver: number;   // cap on earnings per referred driver
  referralBonus: number;           // one-time bonus on first referral
  isActive: boolean;               // toggle the whole program on/off
}

export enum SystemSettingEnum {
  PRICE_CONTROL = 'price_control',
  REFERRAL_PROGRAM = 'referral_program',
}

export interface CreateContactSupportDto {
  subject: string;
  message: string;
  firstName: string;   // for guest users
  lastName: string;    // for guest users
  email: string;       // for guest users
}

export interface ContactSupportQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: ContactSupportStatus;
  userType?: UserRole;
}

// export enum UserRole {
//   PASSENGER = 'passenger',
//   DRIVER = 'driver',
//   ADMIN = 'admin',
//   AGENT = 'agent',
//   GUEST = 'guest',
// }

// export enum PermissionLevel {
//   READ = 'read',
//   WRITE = 'write',
//   FULL = 'full',
// }

// export enum TicketStatus {
//   PENDING = 'pending',   // booking created, payment not confirmed
//   ISSUED = 'issued',     // paid → QR ticket is live
//   SCANNED = 'scanned',   // boarded + driver credited
//   VOID = 'void',         // cancelled / refunded
// }

// export enum UserStatus {
//   ACTIVE = 'active',
//   INACTIVE = 'inactive',
//   SUSPENDED = 'suspended',
//   PENDING = 'pending',
// }

// export enum TripStatus {
//   PENDING = 'upcoming',
//   ACTIVE = 'active',
//   COMPLETED = 'completed',
//   CANCELLED = 'cancelled',
//   CLOSED = 'closed',
// }

// export enum BookingStatus {
//   PENDING = 'pending',
//   CONFIRMED = 'confirmed',
//   CANCELLED = 'cancelled',
//   COMPLETED = 'completed',
//   REFUNDED = 'refunded',
// }

// export enum PaymentStatus {
//   PENDING = 'pending',
//   SUCCESS = 'success',
//   FAILED = 'failed',
//   REFUNDED = 'refunded',
// }

// export enum PaymentGateway {
//   PAYSTACK = 'paystack',
//   FLUTTERWAVE = 'flutterwave',
// }

// export enum PayoutStatus {
//   PENDING = 'pending',
//   APPROVED = 'approved',
//   DECLINED = 'declined',
//   PROCESSING = 'processing',
//   COMPLETED = 'completed',
// }

// export enum DocumentStatus {
//   PENDING = 'pending',
//   APPROVED = 'approved',
//   REJECTED = 'rejected',
// }

// export enum KycStatus {
//   NOT_STARTED = 'not_started',
//   IN_PROGRESS = 'in_progress',
//   COMPLETED = 'completed',
//   FAILED = 'failed',
// }

// export enum VehicleType {
//   BUS = 'bus',
//   MINI_BUS = 'mini_bus',
//   CAR = 'car',
//   HIACE = 'hiace',
//   COASTER = 'coaster',
// }

// export enum NotificationType {
//   TRIP_CREATED= 'trip_created',
//   TRIP_BOOKED = 'trip_booked',
//   TRIP_CANCELLED = 'trip_cancelled',
//   TRIP_COMPLETED = 'trip_completed',
//   PAYMENT_SUCCESS = 'payment_success',
//   PAYMENT_FAILED = 'payment_failed',
//   PAYOUT_APPROVED = 'payout_approved',
//   PAYOUT_DECLINED = 'payout_declined',
//   DOCUMENT_APPROVED = 'document_approved',
//   DOCUMENT_REJECTED = 'document_rejected',
//   BROADCAST = 'broadcast',
//   ANNOUNCEMENT = 'announcement',
//   OTP = 'otp',
// }

// export enum CouponType {
//   PERCENTAGE = 'percentage',
//   FIXED = 'fixed',
//   WELCOME = 'welcome',
//   REFERRAL = 'referral',
// }

// export enum CouponStatus {
//   ACTIVE = 'active',
//   INACTIVE = 'inactive',
//   EXPIRED = 'expired',
// }

// export enum TransactionType {
//   CREDIT = 'credit',
//   DEBIT = 'debit',
//   REFUND = 'refund',
//   PAYOUT = 'payout',
// }

// export enum AppPlatform {
//   ANDROID = 'android',
//   IOS = 'ios',
// }

// export enum ContactSupportStatus {
//   PENDING = 'pending',
//   IN_PROGRESS = 'in_progress',
//   RESOLVED = 'resolved',
//   CLOSED = 'closed',
// }

// export enum EscrowStatus {
//   HELD = 'held',
//   RELEASED = 'released',
//   REFUNDED = 'refunded',
//   DISPUTED = 'disputed',
// }

// export interface PriceControlDto {
//   agentEarningAmount: number;     // max an agent can earn per referred driver
//   platformCommissionRate: number; // % platform takes per booking
//   driverEarningRate: number;      // % driver earns per booking
//   minTripPrice: number;           // minimum price for a trip
//   maxTripPrice: number;           // maximum price for a trip
// }

// export interface ReferralProgramDto {
//   earningPerTrip: number;         // how much agent earns per completed trip
//   maxEarningPerDriver: number;   // cap on earnings per referred driver
//   referralBonus: number;           // one-time bonus on first referral
//   isActive: boolean;               // toggle the whole program on/off
// }

// export enum SystemSettingEnum {
//   PRICE_CONTROL = 'price_control',
//   REFERRAL_PROGRAM = 'referral_program',
// }

// export interface CreateContactSupportDto {
//   subject: string;
//   message: string;
//   firstName: string;   // for guest users
//   lastName: string;    // for guest users
//   email: string;       // for guest users
// }

// export interface ContactSupportQueryDto {
//   page?: number;
//   limit?: number;
//   search?: string;
//   status?: ContactSupportStatus;
//   userType?: UserRole;
// }