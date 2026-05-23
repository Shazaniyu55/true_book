import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';

@Entity('kill_switch')
export class KillSwitch extends BaseEntity {
  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({ type: 'varchar', nullable: true })
  reason: string;

  @Column({ type: 'varchar', nullable: true })
  activatedBy: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  activatedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  deactivatedBy: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  deactivatedAt: Date;

  @Column({ type: 'varchar', array: true, default: [] })
  killedServices: string[];

  /** Audit trail of all toggle events */
  @Column({ type: 'jsonb', default: [] })
  auditLog: Array<{
    action: 'activated' | 'deactivated';
    actor: string;
    reason?: string;
    timestamp: string;
  }>;
}
