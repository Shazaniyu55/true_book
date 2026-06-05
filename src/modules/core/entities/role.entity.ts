import {
  Column,
  Entity,
  OneToMany,

} from 'typeorm';
import { User } from './user.entity';
import { Permission } from './permission.entity';
import { BaseEntity } from './base.entity';

@Entity('roles')
export class Role  extends BaseEntity{

  @Column({ unique: true })
  name: string;

  @OneToMany(() => User, (user) => user.role)
  users: User[];

  @OneToMany(() => Permission, (permission) => permission.role)
  permissions: Permission[];


  // @CreateDateColumn()
  // createdAt: Date;

  // @UpdateDateColumn()
  // updatedAt: Date;
}
