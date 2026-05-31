// src/shared/access-control/ac-grants.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '@modules/core/entities/role.entity';
import { Permission } from '@modules/core/entities/permission.entity';
import { AcGrantsService } from './ac-grants.service';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission])],
  providers: [AcGrantsService],
  exports: [AcGrantsService],
})
export class AcGrantsModule {}