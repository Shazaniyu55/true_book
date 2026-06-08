import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Booking } from './booking.entity';
import { Passenger } from './passenger.entity';
import { Trip } from './trip.entity';
import { PaymentStatus } from '../../../types/enums';

@Entity('payments')
export class Payment extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  bookingId: string;

  @ManyToOne(() => Booking, { nullable: true })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  @Column({ type: 'uuid', nullable: true })
  passengerId: string;

  @ManyToOne(() => Passenger, { nullable: true })
  @JoinColumn({ name: 'passengerId' })
  passenger: Passenger;

  @Column({ type: 'uuid', nullable: true })
  tripId: string;

  @ManyToOne(() => Trip, { nullable: true })
  @JoinColumn({ name: 'tripId' })
  trip: Trip;

  @Column({ type: 'varchar', default: 'NGN' })
  currency: string;

  @Column({ type: 'jsonb', nullable: true })
  billingDetails: Record<string, any>;

  @Column({ type: 'varchar', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  txRef: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', nullable: true })
  paymentType: string;

  @Column({ type: 'varchar', nullable: true })
  customerName: string;

  @Column({ type: 'varchar', nullable: true })
  customerEmail: string;

  @Column({ type: 'jsonb', nullable: true })
  card: any[];

  @Column({ type: 'varchar', nullable: true })
  raveReference: string;
}