import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { DocumentStatus } from '../../../types/enums';
import { Driver } from './driver.entity';
import { BaseEntity } from './base.entity';

@Entity('document_verifications')
export class DocumentVerification extends BaseEntity {
  @Column({ type: 'varchar' })
  driverId: string;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driverId' })
  driver: Driver;

  @Column({ type: 'varchar' })
  documentType: string;

  @Column({ type: 'varchar' })
  documentUrl: string;

  @Column({ type: 'varchar', enum: DocumentStatus, default: DocumentStatus.PENDING })
  status: DocumentStatus;

  @Column({ type: 'varchar', nullable: true })
  rejectionReason: string;

  @Column({ type: 'jsonb', nullable: true })
  verificationData: Record<string, any>;
}
