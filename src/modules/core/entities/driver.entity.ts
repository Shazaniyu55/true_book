import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { KycStatus, UserStatus } from '../../../types/enums';
import { User } from './user.entity';
import { BaseEntity } from './base.entity';

@Entity('drivers')
export class Driver extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Column({ type: 'varchar', enum: KycStatus, default: KycStatus.NOT_STARTED })
  kycStatus: KycStatus;

  // ── BVN ──────────────────────────────────────────────────────────────────
  @Column({ type: 'varchar', nullable: true })
  bvn: string;

  @Column({ type: 'boolean', default: false })
  bvnVerified: boolean;

  @Column({ type: 'jsonb', nullable: true })
  bvnData: Record<string, any>;

  @Column({ type: 'timestamp with time zone', nullable: true })
  bvnVerifiedAt: Date;

  // ── NIN ──────────────────────────────────────────────────────────────────
  @Column({ type: 'varchar', nullable: true })
  nin: string;

  @Column({ type: 'boolean', default: false })
  ninVerified: boolean;

  @Column({ type: 'jsonb', nullable: true })
  ninData: Record<string, any>;

  @Column({ type: 'timestamp with time zone', nullable: true })
  ninVerifiedAt: Date;

  // ── Driver's Licence ──────────────────────────────────────────────────────
  @Column({ type: 'varchar', nullable: true })
  licenseNumber: string;

  @Column({ type: 'date', nullable: true })
  licenseExpiry: Date;

  @Column({ type: 'boolean', default: false })
  licenseVerified: boolean;

  @Column({ type: 'jsonb', nullable: true })
  licenseData: Record<string, any>;

  @Column({ type: 'timestamp with time zone', nullable: true })
  licenseVerifiedAt: Date;

  // ── Wallet / Bank ────────────────────────────────────────────────────────
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  walletBalance: number;

  @Column({ type: 'varchar', nullable: true })
  bankAccountName: string;

  @Column({ type: 'varchar', nullable: true })
  bankAccountNumber: string;

  @Column({ type: 'varchar', nullable: true })
  bankCode: string;

  @Column({ type: 'varchar', nullable: true })
  bankName: string;

  // ── PIN ──────────────────────────────────────────────────────────────────
  @Column({ type: 'varchar', nullable: true })
  transactionPin: string;

  @Column({ type: 'integer', default: 0 })
  pinAttempts: number;

  @Column({ type: 'boolean', default: false })
  isPinSet: boolean;
}