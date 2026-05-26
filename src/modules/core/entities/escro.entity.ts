import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Booking } from './booking.entity';
import { EscrowStatus } from 'src/types/enums';


/**
 * Escrow record — created when a booking payment is confirmed.
 * Funds are conceptually held until the trip completes.
 * On completion: released to driver wallet.
 * On cancellation: refunded to passenger.
 */
@Entity('escrows')
export class Escrow extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar' })
  reference: string;

  @Column({ type: 'integer' })
  bookingId: number;

  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  /** The gross amount held */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  /** Platform fee (percentage of amount) */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  platformFee: number;

  /** Net amount to be released to driver = amount - platformFee */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  netDriverAmount: number;

  @Column({ type: 'varchar', enum: EscrowStatus, default: EscrowStatus.HELD })
  status: EscrowStatus;

  /** driverId receiving the payout on release */
  @Column({ type: 'integer' })
  driverId: number;

  /** passengerId for refund path */
  @Column({ type: 'integer' })
  passengerId: number;

  /** Paystack transaction reference that funded this escrow */
  @Column({ type: 'varchar', nullable: true })
  paymentReference: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  releasedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  refundedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  releaseReason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}