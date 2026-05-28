import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BookingStatus, PaymentStatus } from '../../../types/enums';
import { Trip } from './trip.entity';
import { Passenger } from './passenger.entity';
import { BaseEntity } from './base.entity';

@Entity('bookings')
export class Booking extends BaseEntity {
  
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

  @Column({ type: 'varchar', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column({ type: 'varchar', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Column({ type: 'varchar', nullable: true })
  paymentReference: string;

  @Column({ type: 'varchar', nullable: true })
  paymentGateway: string;

  @Column({ type: 'varchar', nullable: true })
  couponCode: string;

  @Column({ type: 'boolean', default: false })
  isCheckedIn: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  checkedInAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
