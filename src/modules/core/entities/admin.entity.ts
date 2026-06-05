import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Exclude, Expose } from 'class-transformer';
import { UserRole, UserStatus } from '../../../types/enums';
import { Role } from './role.entity';
import { BaseEntity } from './base.entity';

@Entity('admins')
export class Admin extends BaseEntity {

  @Column({ type: 'varchar' })
  firstName: string;

  @Column({ type: 'varchar' })
  lastName: string;

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
  fullName: string;

  @Exclude({ toPlainOnly: true })
  @Column({ type: 'uuid', nullable: true })
  roleId: string;




  @ManyToOne(() => Role, (role) => role.users, { eager: false })
  @JoinColumn({ name: 'roleId' })
  roletru: Role;

  @Column({ type: 'varchar', nullable: true })
  role: string;



  @Column({ type: 'varchar', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Column({ type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ type: 'boolean', default: false })
  isPhoneVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  profilePhoto: string;

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

  @Column({ type: 'varchar', nullable: true })
  city: string;

  @Column({ type: 'varchar', nullable: true })
  country: string;

  @Column({ type: 'varchar', nullable: true })
  address: string;

  @Column({ type: 'varchar', nullable: true })
  gender: string;

  @Column({ type: 'date', nullable: true })
  dob: string;



}

