import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Driver } from './driver.entity';
import { Agent } from './agent.entity';


export enum BeneficiaryType {
  DRIVER = 'driver',
  AGENT = 'agent',
}

@Entity('beneficiaries')
@Index(['driverId', 'agentId'])
export class Beneficiary extends BaseEntity {
  @Column({ type: 'uuid' })
  beneficiaryableId: string;

    @Column({ type: 'uuid', nullable: true })
  driverId: string | null;

    @ManyToOne(() => Driver, (driver) => driver.beneficiaries, {
    nullable: true,
    onDelete: 'CASCADE',
  })

  @Column({ type: 'varchar', nullable: true })
recipientCode: string;

    @JoinColumn({ name: 'driverId' })
  driver?: Driver;

  @Column({ type: 'uuid', nullable: true })
  agentId: string | null;

    @ManyToOne(() => Agent, (agent) => agent.beneficiaries, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'agentId' })
  agent?: Agent;

    @Column({ type: 'varchar', enum: BeneficiaryType })
  ownerType: BeneficiaryType;

  @Column({ type: 'varchar' })
  beneficiaryableType: string;

  @Column({ type: 'varchar', nullable: true })
  bankHolderName: string;

  @Column({ type: 'varchar' })
  accountNumber: string;

  @Column({ type: 'varchar' })
  bankCode: string;

  @Column({ type: 'varchar', nullable: true })
  bankName: string;

  /** Optional friendly label, e.g. "My GTBank" */
  @Column({ type: 'varchar', nullable: true })
  nickname: string;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}