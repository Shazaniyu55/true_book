import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum AuditAction {
  PAYOUT_APPROVED = 'payout.approved',
  PAYOUT_DECLINED = 'payout.declined',
  BOOKING_REFUNDED = 'booking.refunded',
  KYC_APPROVED = 'kyc.approved',
  KYC_REJECTED = 'kyc.rejected',
  USER_SUSPENDED = 'user.suspended',
  USER_ACTIVATED = 'user.activated',
  KILLSWITCH_ACTIVATED = 'killswitch.activated',
  KILLSWITCH_DEACTIVATED = 'killswitch.deactivated',
  COUPON_CREATED = 'coupon.created',
  LOGIN = 'auth.login',
}

@Entity('audit_logs')
@Index(['actorId'])
@Index(['action'])
@Index(['resourceType', 'resourceId'])
@Index(['createdAt'])
export class AuditLog extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  actorId: string;            // who performed it (admin/user id)

  @Column({ type: 'varchar', nullable: true })
  actorEmail: string;

  @Column({ type: 'varchar', nullable: true })
  actorRole: string;

  @Column({ type: 'varchar' })
  action: string;             // AuditAction value

  @Column({ type: 'varchar', nullable: true })
  resourceType: string;       // 'payout' | 'booking' | 'driver' ...

  @Column({ type: 'varchar', nullable: true })
  resourceId: string;

  @Column({ type: 'varchar', default: 'success' })
  outcome: 'success' | 'failure';

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;   // reason, amounts, before/after — NO raw PII

  @Column({ type: 'varchar', nullable: true })
  ipHash: string;             // use your existing hashIp()

  @Column({ type: 'varchar', nullable: true })
  userAgentHash: string;
}