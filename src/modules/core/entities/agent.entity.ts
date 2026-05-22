import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { User } from './user.entity';

@Entity('agents')
export class Agent extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'integer' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  walletBalance: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCommission: number;

  @Column({ type: 'varchar', nullable: true })
  bankAccountName: string;

  @Column({ type: 'varchar', nullable: true })
  bankAccountNumber: string;

  @Column({ type: 'varchar', nullable: true })
  bankCode: string;

  @Column({ type: 'integer', default: 0 })
  totalReferrals: number;
}
