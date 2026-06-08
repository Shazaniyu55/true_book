import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Driver } from './driver.entity';
import { Booking } from './booking.entity';

@Entity('system_records')
export class SystemRecord extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  driverId: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driverId' })
  driver: Driver;

  @Column({ type: 'uuid', nullable: true })
  bookingId: string;

  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  platformEarning: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  driverEarned: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountApplied: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amountMade: number;

  @Column({ type: 'boolean', default: false })
  isCancelled: boolean;
}