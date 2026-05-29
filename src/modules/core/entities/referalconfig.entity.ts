import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Stores the platform-wide referral reward configuration.
 * A single row is maintained (singleton pattern).
 *
 * Example: referralsRequired=5, rewardCouponValue=500 (NGN flat discount)
 * means: when a referrer accumulates 5 qualified referrals, they get a coupon
 * worth NGN 500 off their next booking.
 */
@Entity('referral_config')
export class ReferralConfig extends BaseEntity {
  /** Number of successful referrals needed to earn a reward */
  @Column({ type: 'integer', default: 5 })
  referralsRequired: number;

  /**
   * Type of reward: 'flat' (NGN amount) or 'percentage'
   */
  @Column({ type: 'varchar', default: 'flat' })
  rewardType: 'flat' | 'percentage';

  /** Reward value (NGN or %) */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 500 })
  rewardValue: number;

  /** Max discount cap when rewardType is 'percentage' */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscount: number;

  /** Coupon validity in days once issued */
  @Column({ type: 'integer', default: 30 })
  couponValidityDays: number;

  @Column({ type: 'boolean', default: true })
  isEnabled: boolean;
}