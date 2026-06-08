
import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';



@Entity('system_settings')
export class SystemSetting extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  key: string;

  @Column({ type: 'jsonb', nullable: true })
  value: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  description: string;
}