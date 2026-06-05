import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Trip } from './trip.entity';
import { Driver } from './driver.entity';

@Entity('trip_locations')
@Index(['tripId', 'createdAt'])
export class TripLocation extends BaseEntity {
  @Column({ type: 'uuid' })
  tripId: string;

  @ManyToOne(() => Trip)
  @JoinColumn({ name: 'tripId' })
  trip: Trip;

  @Column({ type: 'uuid' })
  driverId: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driverId' })
  driver: Driver;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ type: 'float', nullable: true })
  heading: number; // degrees, for rotating the marker

  @Column({ type: 'float', nullable: true })
  speed: number; // m/s, optional
}