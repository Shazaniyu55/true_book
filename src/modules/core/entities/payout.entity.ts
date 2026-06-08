import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { PayoutStatus } from '../../../types/enums';
import { BaseEntity } from './base.entity';
import { Beneficiary } from './beneficiary.entity';
import { Driver } from './driver.entity';
import { Agent } from './agent.entity';

@Entity('payouts')
export class Payout extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar' })
  reference: string;

  @Column({ type: 'uuid', nullable: true })
  driverId: string | null;

  @Column({ type: 'uuid', nullable: true })
  agentId: string | null;

  @Column({ type: 'uuid' })
  beneficiaryId: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driverId' })  // ✅ Fixed: was pointing to agentId
  driver: Driver;

  @ManyToOne(() => Agent)
  @JoinColumn({ name: 'agentId' })   // ✅ Fixed: was pointing to driverId
  agent: Agent;

  @ManyToOne(() => Beneficiary)
  @JoinColumn({ name: 'beneficiaryId' })
  beneficiary: Beneficiary;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', enum: PayoutStatus, default: PayoutStatus.PENDING })
  status: PayoutStatus;

  @Column({ type: 'varchar', nullable: true })
  transferCode: string;

  @Column({ type: 'varchar', nullable: true })
  paymentMethod: string;

  @Column({ type: 'varchar', nullable: true })
  recipientCode: string;

  @Column({ type: 'varchar', nullable: true })
  payoutableType: string;  // 'agent' | 'driver' | 'passenger'

  @Column({ type: 'uuid' })
  payoutableId: string;

  @Column({ type: 'varchar', nullable: true })
  reason: string;

  @Column({ type: 'varchar', nullable: true })
  narration: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  transactionDate: Date;

  @Column({ type: 'jsonb', nullable: true })
  paymentDetails: any[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
// import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
// import { PayoutStatus } from '../../../types/enums';
// import { BaseEntity } from './base.entity';
// import { Beneficiary } from './beneficiary.entity';
// import { Driver } from './driver.entity';
// import { Agent } from './agent.entity';

// @Entity('payouts')
// export class Payout extends BaseEntity {
//   @Index({ unique: true })
//   @Column({ type: 'varchar' })
//   reference: string;

//   @Column({ type: 'uuid', nullable: true })
//   driverId: string | null;

//     @Column({ type: 'uuid', nullable: true })
//   agentId: string | null;

//   @Column({ type: 'uuid' })
//   beneficiaryId: string;

//     @ManyToOne(() => Driver)
//   @JoinColumn({ name: 'driverId' })
//    driver: Driver;

//   @ManyToOne(() => Agent)
//   @JoinColumn({ name: 'agentId' })
//    agent: Agent;

//   @ManyToOne(() => Beneficiary)
//   @JoinColumn({ name: 'beneficiaryId' })
//   beneficiary: Beneficiary;

//   @Column({ type: 'decimal', precision: 10, scale: 2 })
//   amount: number;

//   @Column({ type: 'varchar', enum: PayoutStatus, default: PayoutStatus.PENDING })
//   status: PayoutStatus;
// @Column({ type: 'varchar', nullable: true })
// transferCode: string;

//   @Column({ type: 'varchar', nullable: true })
//   paymentMethod: string;

//   @Column({ type: 'varchar', nullable: true })
// recipientCode: string;

//   @Column({ type: 'varchar', nullable: true })
//   payoutableType: string;

//   @Column({ type: 'uuid' })
//   payoutableId: string;

//   @Column({ type: 'varchar', nullable: true })
//   reason: string;

//   @Column({ type: 'varchar', nullable: true })
//   narration: string;

//   @Column({ type: 'timestamp with time zone', nullable: true })
//   transactionDate: Date;

//   @Column({ type: 'jsonb', nullable: true })
//   paymentDetails: any[];

//   @Column({ type: 'jsonb', nullable: true })
//   metadata: Record<string, any>;
// }
