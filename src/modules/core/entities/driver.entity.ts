import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { KycStatus, UserStatus } from '../../../types/enums';
import { User } from './user.entity';
import { BaseEntity } from './base.entity';
import { Beneficiary } from './beneficiary.entity';
import { Vehicle } from './vehicle.entity';

@Entity('drivers')
export class Driver extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Column({ type: 'varchar', enum: KycStatus, default: KycStatus.NOT_STARTED })
  kycComplete: KycStatus;

  @Column({ type: 'uuid', nullable: true })
  vehicleId: string;

  @ManyToOne(() => Vehicle)
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;
  

  // ── Driver's Licence ──────────────────────────────────────────────────────
  @Column({ type: 'varchar', nullable: true })
  license: string;

  @Column({ type: 'varchar', nullable: true })
  reason: string;

  @Column({ type: 'date', nullable: true })
  yearOfExpire: Date;

  @Column({ type: 'boolean', default: false })
  licenseVerified: boolean;

  @Column({ type: 'jsonb', nullable: true })
  licenseData: Record<string, any>;

  @Column({ type: 'timestamp with time zone', nullable: true })
  licenseVerifiedAt: Date;

  // ── Wallet / Bank ────────────────────────────────────────────────────────
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  currentBalance: number;

  @Column({ type: 'boolean', default: false })
  vehicleVerified: boolean;

  @OneToMany(() => Beneficiary, (b) => b.driver)
  beneficiaries: Beneficiary[];
 

  @Column({ type: 'timestamp with time zone', nullable: true })
  vehicleVerifiedAt: Date;

  // ── PIN ──────────────────────────────────────────────────────────────────
  @Column({ type: 'varchar', nullable: true })
  pin: string;

  @Column({ type: 'integer', default: 0 })
  pinAttempts: number;

  @Column({ type: 'boolean', default: false })
  isPinSet: boolean;
  
  // ── Ratings ──────────────────────────────────────────────────────────────
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;   // 0.00 – 5.00

  @Column({ type: 'integer', default: 0 })
  ratingCount: number;
}