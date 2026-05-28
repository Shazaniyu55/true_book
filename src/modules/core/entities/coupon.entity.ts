import { Column, Entity, Index } from 'typeorm';
import { CouponStatus, CouponType } from '../../../types/enums';
import { BaseEntity } from './base.entity';

@Entity('coupons')
export class Coupon extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar' })
  code: string;

  @Column({ type: 'varchar', enum: CouponType })
  type: CouponType;

  @Column({ type: 'varchar', enum: CouponStatus, default: CouponStatus.ACTIVE })
  status: CouponStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minOrderAmount: number;

  @Column({ type: 'integer', nullable: true })
  usageLimit: number;

  @Column({ type: 'integer', default: 0 })
  usageCount: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expiresAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'integer', nullable: true })
  createdByUserId: number;
}
