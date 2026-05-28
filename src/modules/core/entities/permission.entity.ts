import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from './role.entity';
import { BaseEntity } from './base.entity';

@Entity('permissions')
export class Permission extends BaseEntity{

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'uuid' })
  roleId: string;

  @ManyToOne(() => Role, (role) => role.permissions)
  role: Role;

  @Column({ default: true })
  status: boolean;
}
