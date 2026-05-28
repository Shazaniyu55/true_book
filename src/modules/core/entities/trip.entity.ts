import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TripStatus } from '../../../types/enums';
import { Driver } from './driver.entity';
import { Vehicle } from './vehicle.entity';
import { BaseEntity } from './base.entity';
import { Passenger } from './passenger.entity';

@Entity('trips')
export class Trip extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar' })
  reference: string;

  @Column({ type: 'string' })
  driverId: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driverId' })
  driver: Driver;

  @Column({ type: 'uuid', nullable: true })
  vehicleId: string;

  @ManyToOne(() => Vehicle, { nullable: true })
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;

@Column({ type: 'uuid', nullable: true })
passengerId: string | null;

@ManyToOne(() => Passenger, { nullable: true })
@JoinColumn({ name: 'passengerId' })
passenger: Passenger;

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

    @Column({ type: 'varchar', nullable: true })       // ← ADD
  description: string;

  @Column({ type: 'jsonb', nullable: true })          // ← ADD
  amenities: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
