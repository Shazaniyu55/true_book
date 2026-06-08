import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('vehicle_types')
export class VehicleType extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;
}