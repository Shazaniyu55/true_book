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


  @Column({ type: 'varchar', nullable: true })
  nxt_kin_name: string;

  @Column({ type: 'varchar', nullable: true })
  nxt_kin_relationship: string;

  @Column({ type: 'varchar', nullable: true })
  nxt_kin_telephone: string;


  @Column({ type: 'jsonb', nullable: true })
  payment_details: Record<string, any>;


  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}