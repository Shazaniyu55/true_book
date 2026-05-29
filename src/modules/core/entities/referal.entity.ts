import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { BaseEntity } from './base.entity';

@Entity('referrals')
export class Referral extends BaseEntity {
  /** The user who referred */
  @Index()
  @Column({ type: 'uuid' })
  referrerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'referrerId' })
  referrer: User;

  /** The user who was referred */
  @Index({ unique: true })
  @Column({ type: 'uuid' })
  referredUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'referredUserId' })
  referredUser: User;

  /** Set to true once the referred user completes their first booking */
  @Column({ type: 'boolean', default: false })
  isQualified: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  qualifiedAt: Date;
}