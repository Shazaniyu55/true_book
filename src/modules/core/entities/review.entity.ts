import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Booking } from './booking.entity';
import { Trip } from './trip.entity';
import { Driver } from './driver.entity';
import { Passenger } from './passenger.entity';

/**
 * A passenger's review of a driver for a completed booking.
 * One review per booking (enforced by the unique index on bookingId).
 * Creating a review recalculates the driver's averageRating / ratingCount.
 */
@Entity('reviews')
export class Review extends BaseEntity {
  /** One review per booking */
  @Index({ unique: true })
  @Column({ type: 'uuid' })
  bookingId: string;

  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  @Index()
  @Column({ type: 'uuid' })
  driverId: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driverId' })
  driver: Driver;

  @Column({ type: 'uuid' })
  passengerId: string;

  @ManyToOne(() => Passenger)
  @JoinColumn({ name: 'passengerId' })
  passenger: Passenger;

  @Column({ type: 'uuid', nullable: true })
  tripId: string;

  @ManyToOne(() => Trip, { nullable: true })
  @JoinColumn({ name: 'tripId' })
  trip: Trip;

  /** 1–5 star rating */
  @Column({ type: 'integer' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  /** Admin can hide an abusive review without deleting it (excluded from aggregates) */
  @Column({ type: 'boolean', default: true })
  isVisible: boolean;
}