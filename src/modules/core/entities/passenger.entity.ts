import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { KycStatus } from '../../../types/enums';
import { BaseEntity } from './base.entity';

@Entity('passengers')
export class Passenger extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  walletBalance: number;

  @Column({ type: 'integer', default: 0 })
  totalTrips: number;

  // ── KYC ──────────────────────────────────────────────────────────────────
  @Column({ type: 'varchar', enum: KycStatus, default: KycStatus.NOT_STARTED })
  kycStatus: KycStatus;

  @Column({ type: 'varchar', nullable: true })
  bvn: string;

  @Column({ type: 'boolean', default: false })
  bvnVerified: boolean;

  @Column({ type: 'jsonb', nullable: true })
  bvnData: Record<string, any>;

  @Column({ type: 'timestamp with time zone', nullable: true })
  bvnVerifiedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  nin: string;

  @Column({ type: 'boolean', default: false })
  ninVerified: boolean;

  @Column({ type: 'jsonb', nullable: true })
  ninData: Record<string, any>;

  @Column({ type: 'timestamp with time zone', nullable: true })
  ninVerifiedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}