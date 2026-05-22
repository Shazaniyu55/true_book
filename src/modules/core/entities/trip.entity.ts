import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { TripStatus } from '../../../types/enums';
import { Driver } from './driver.entity';
import { Vehicle } from './vehicle.entity';

@Entity('trips')
export class Trip extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar' })
  reference: string;

  @Column({ type: 'integer' })
  driverId: number;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driverId' })
  driver: Driver;

  @Column({ type: 'integer', nullable: true })
  vehicleId: number;

  @ManyToOne(() => Vehicle, { nullable: true })
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;

  @Column({ type: 'varchar' })
  origin: string;

  @Column({ type: 'varchar' })
  destination: string;

  @Column({ type: 'timestamp with time zone' })
  departureTime: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  arrivalTime: Date;

  @Column({ type: 'integer' })
  totalSeats: number;

  @Column({ type: 'integer', default: 0 })
  bookedSeats: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pricePerSeat: number;

  @Column({ type: 'varchar', enum: TripStatus, default: TripStatus.PENDING })
  status: TripStatus;

  @Column({ type: 'jsonb', nullable: true })
  waypoints: any[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
