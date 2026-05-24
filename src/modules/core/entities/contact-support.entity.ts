import { ContactSupportStatus, UserRole } from 'src/types/enums';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';




@Entity('contact_supports')
@Index(['email'])
@Index(['status'])
@Index(['user_type'])
@Index(['created_at'])
export class ContactSupport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 500 })
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.PASSENGER,
  })
  user_type: UserRole;

  @Column({
    type: 'enum',
    enum: ContactSupportStatus,
    default: ContactSupportStatus.PENDING,
  })
  status: ContactSupportStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}