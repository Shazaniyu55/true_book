import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { KycStatus, UserStatus } from '../../../types/enums';
import { User } from './user.entity';

@Entity('drivers')
export class Driver extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'integer' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Column({ type: 'varchar', enum: KycStatus, default: KycStatus.NOT_STARTED })
  kycStatus: KycStatus;

  @Column({ type: 'varchar', nullable: true })
  licenseNumber: string;

  @Column({ type: 'date', nullable: true })
  licenseExpiry: Date;

  @Column({ type: 'varchar', nullable: true })
  bvn: string;

  @Column({ type: 'varchar', nullable: true })
  nin: string;

  @Column({ type: 'boolean', default: false })
  bvnVerified: boolean;

  @Column({ type: 'boolean', default: false })
  ninVerified: boolean;

  @Column({ type: 'boolean', default: false })
  licenseVerified: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  walletBalance: number;

  @Column({ type: 'varchar', nullable: true })
  bankAccountName: string;

  @Column({ type: 'varchar', nullable: true })
  bankAccountNumber: string;

  @Column({ type: 'varchar', nullable: true })
  bankCode: string;

  @Column({ type: 'varchar', nullable: true })
  bankName: string;

  @Column({ type: 'varchar', nullable: true })
  transactionPin: string;

  @Column({ type: 'integer', default: 0 })
  pinAttempts: number;

  @Column({ type: 'boolean', default: false })
  isPinSet: boolean;
}
