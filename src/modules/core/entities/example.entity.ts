import { Column, Entity, Index } from 'typeorm';

import { BaseEntity } from '@shared/repositories/base.entity';

export enum ExampleTaskStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  DONE = 'done',
}

@Entity()
export class ExampleTask extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar' })
  reference: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'varchar',
    enum: ExampleTaskStatus,
    default: ExampleTaskStatus.DRAFT,
  })
  status: ExampleTaskStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
