import { Column, Entity, Index } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '@shared/repositories/base.entity';
import { UserRole, UserStatus } from '../../../types/enums';

@Entity('admins')
export class Admin extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar' })
  email: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', nullable: true })
  phone: string;

  @Exclude({ toPlainOnly: true })
  @Column({ type: 'varchar', nullable: true })
  password: string;

  @Column({ type: 'varchar' })
  firstName: string;

  @Column({ type: 'varchar' })
  lastName: string;

  @Column({ type: 'varchar', enum: UserRole, default: UserRole.ADMIN })
  role: UserRole;

  @Column({ type: 'varchar', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Column({ type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ type: 'boolean', default: false })
  isPhoneVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  profilePhoto: string;

  @Column({ type: 'varchar', nullable: true })
  referralCode: string;

  @Column({ type: 'varchar', nullable: true })
  referredBy: string;

  @Column({ type: 'varchar', nullable: true })
  fcmToken: string;

  @Column({ type: 'varchar', nullable: true })
  deviceType: string;

  @Exclude({ toPlainOnly: true })
  @Column({ type: 'varchar', nullable: true })
  otpCode: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  otpExpiresAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
