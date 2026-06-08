import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { NotificationType } from '../../../types/enums';
import { User } from './user.entity';
import { BaseEntity } from './base.entity';
import { Admin } from './admin.entity';

@Entity('notifications')
export class Notification extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User,  {nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  adminId: string | null;

  @ManyToOne(() => Admin, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'adminId' })
  admin: Admin;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;
}
