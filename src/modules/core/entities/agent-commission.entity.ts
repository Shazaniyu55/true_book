import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Agent } from './agent.entity';
import { Booking } from './booking.entity';

/**
 * Tracks individual commission events for an agent.
 * When an agent books a trip for a passenger, a commission record is created.
 * Commission is released once the booking payment is confirmed.
 */
@Entity('agent_commissions')
export class AgentCommission extends BaseEntity {
  @Index()
  @Column({ type: 'integer' })
  agentId: number;

  @ManyToOne(() => Agent)
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column({ type: 'integer', nullable: true })
  bookingId: number;

  @ManyToOne(() => Booking, { nullable: true })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  /** Gross booking amount that commission was calculated on */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  bookingAmount: number;

  /** Commission percentage applied */
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  commissionRate: number;

  /** Actual commission earned */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  commissionAmount: number;

  @Column({ type: 'varchar', default: 'pending' })
  status: 'pending' | 'released' | 'reversed';

  @Column({ type: 'varchar', nullable: true })
  description: string;
}
