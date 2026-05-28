import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { PayoutStatus } from '../../../types/enums';
import { Driver } from './driver.entity';
import { BaseEntity } from './base.entity';

@Entity('payouts')
export class Payout extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar' })
  reference: string;

  @Column({ type: 'uuid' })
  driverId: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driverId' })
  driver: Driver;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', enum: PayoutStatus, default: PayoutStatus.PENDING })
  status: PayoutStatus;

  @Column({ type: 'varchar', nullable: true })
  transferCode: string;

  @Column({ type: 'varchar', nullable: true })
  recipientCode: string;

  @Column({ type: 'varchar', nullable: true })
  reason: string;

  @Column({ type: 'varchar', nullable: true })
  declineReason: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  processedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
