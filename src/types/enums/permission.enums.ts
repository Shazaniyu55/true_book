
export enum Permission {
  // Payouts
  PAYOUT_VIEW = 'payout:view',
  PAYOUT_APPROVE = 'payout:approve',
  PAYOUT_DECLINE = 'payout:decline',
  // Bookings
  BOOKING_VIEW = 'booking:view',
  BOOKING_REFUND = 'booking:refund',
  // KYC
  KYC_VIEW = 'kyc:view',
  KYC_APPROVE = 'kyc:approve',
  KYC_REJECT = 'kyc:reject',
  // Users
  USER_VIEW = 'user:view',
  USER_SUSPEND = 'user:suspend',
  // Coupons
  COUPON_MANAGE = 'coupon:manage',
  // Kill switch
  KILLSWITCH_TOGGLE = 'killswitch:toggle',
}