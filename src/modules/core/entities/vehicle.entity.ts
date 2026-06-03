import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { VehicleType } from '../../../types/enums';
import { Driver } from './driver.entity';
import { BaseEntity } from './base.entity';

@Entity('vehicles')
export class Vehicle extends BaseEntity {
  @Column({ type: 'uuid' })
  driverId: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driverId' })
  driver: Driver;

  @Column({ type: 'varchar', enum: VehicleType })
  type: VehicleType;

  @Column({ type: 'varchar' })
  make: string;

  @Column({ type: 'varchar' })
  model: string;

  @Column({ type: 'varchar' })
  year: string;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  plateNumber: string;

  @Column({ type: 'varchar' })
  color: string;

  @Column({ type: 'integer' })
  capacity: number;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({ type: 'varchar', nullable: true })
  vehiclePhoto: string;

  @Column({ type: 'jsonb', nullable: true })
  documents: Record<string, any>;
}
