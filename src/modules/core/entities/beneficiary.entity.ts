import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';


@Entity('beneficiaries')
@Index(['beneficiaryableType', 'beneficiaryableId'])
export class Beneficiary extends BaseEntity {
  @Column({ type: 'uuid' })
  beneficiaryableId: string;

  @Column({ type: 'varchar' })
  beneficiaryableType: string;

  @Column({ type: 'varchar', nullable: true })
  bankAccountName: string;

  @Column({ type: 'varchar' })
  bankAccountNumber: string;

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