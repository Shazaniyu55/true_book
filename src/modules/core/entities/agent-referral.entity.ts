
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Agent } from './agent.entity';
import { Driver } from './driver.entity';

@Entity('agent_referrals')
export class AgentReferral extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  agentId: string;

  @ManyToOne(() => Agent)
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Index()
  @Column({ type: 'uuid' })
  driverId: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driverId' })
  driver: Driver;

  @Column({ type: 'varchar', nullable: true })
  referralCode: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  referredAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  earnedAmount: number;
}