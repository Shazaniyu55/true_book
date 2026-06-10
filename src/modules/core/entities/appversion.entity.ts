import { Entity, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('app_version_history')
export class AppVersionHistory extends BaseEntity{


  @Column({ name: 'app_type' })
  appType: string;

  @Column()
  platform: string;

  @Column({ name: 'min_version' })
  minVersion: string;

  @Column({ name: 'latest_version' })
  latestVersion: string;

  @Column({ name: 'is_force_update', default: false })
  isForceUpdate: boolean;

  @Column({ name: 'update_message', type: 'text', nullable: true })
  updateMessage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'is_enabled', default: true })
  isEnabled: boolean;
}