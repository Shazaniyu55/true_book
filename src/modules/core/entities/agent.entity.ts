import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { BaseEntity } from './base.entity';
import { Referral } from './referal.entity';
import { Payout } from './payout.entity';
import { Driver } from './driver.entity';
import { Beneficiary } from './beneficiary.entity';
import { UserStatus } from 'src/types/enums';

@Entity('agents')
export class Agent extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'uuid' })
  userId: string; 

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', nullable: true })
  address: string;

  @Column({ type: 'varchar', nullable: true })
  city: string;

  @Column({ type: 'varchar', nullable: true })
  terms: string;

  @Column({ type: 'varchar', nullable: true })
  stateOfResidence: string;

  @Column({ type: 'varchar', enum: UserStatus, default: UserStatus.PENDING })
    status: UserStatus;
  

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  currentBalance: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCommission: number;

    @OneToMany(() => Beneficiary, (b) => b.agent)
    beneficiaries: Beneficiary[];

  // @Column({ type: 'varchar', nullable: true })
  // bankAccountName: string;

  // @Column({ type: 'varchar', nullable: true })
  // bankAccountNumber: string;

  // @Column({ type: 'varchar', nullable: true })
  // bankCode: string;

  @Column({ type: 'integer', default: 0 })
  totalReferrals: number;




}
