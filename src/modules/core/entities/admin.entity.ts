import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import {  UserStatus } from '../../../types/enums';
import { Role } from './role.entity';
import { BaseEntity } from './base.entity';


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
  fullName: string;


  @Column({ type: 'uuid', nullable: true })
  roleId: string;

  @ManyToOne(() => Role, (role) => role.users, { eager: false })
  @JoinColumn({ name: 'roleId' })
  role: Role;

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
}
