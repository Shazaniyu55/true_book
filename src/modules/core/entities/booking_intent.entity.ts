import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Trip } from './trip.entity';
import { Passenger } from './passenger.entity';
import { BaseEntity } from './base.entity';

export enum BookingIntentStatus {
  PENDING = 'pending',
  CONSUMED = 'consumed',   // became a real booking
  EXPIRED = 'expired',     // never paid, swept
}

@Entity('booking_intents')
export class BookingIntent extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar' })
  bookingCode: string;            

  @Column({ type: 'uuid' })
  tripId: string;

  @ManyToOne(() => Trip)
  @JoinColumn({ name: 'tripId' })
  trip: Trip;

  @Column({ type: 'uuid' })
  passengerId: string;

  @ManyToOne(() => Passenger)
  @JoinColumn({ name: 'passengerId' })
  passenger: Passenger;

  @Column({ type: 'integer', default: 1 })
  seats: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amountPaid: number;

  @Column({ type: 'varchar', nullable: true })
  couponCode: string;

  @Column({ type: 'uuid', nullable: true })
  couponId: string;               
  @Column({ type: 'varchar' })
  paymentReference: string;

  @Column({ type: 'varchar', enum: BookingIntentStatus, default: BookingIntentStatus.PENDING })
  status: BookingIntentStatus;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expiresAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}