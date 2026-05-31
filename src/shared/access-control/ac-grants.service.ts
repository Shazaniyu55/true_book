// src/shared/access-control/ac-grants.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolesBuilder } from 'nest-access-control';
import { Role } from '@modules/core/entities/role.entity';

@Injectable()
export class AcGrantsService {
  private readonly logger = new Logger(AcGrantsService.name);

  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
  ) {}

  /**
   * Reads roles + their active permissions from the DB and produces a
   * RolesBuilder. Each permission string (e.g. 'payout:approve') becomes a
   * resource with read:any — preserving your flat-permission semantics.
   */
  async build(): Promise<RolesBuilder> {
    const roles = await this.roleRepo.find({ relations: ['permissions'] });
    const grants: any[] = [];

    for (const role of roles) {
      const active = (role.permissions ?? []).filter((p) => p.status);
      for (const perm of active) {
        grants.push({
          role: role.name,
          resource: perm.name,   // e.g. 'payout:approve'
          action: 'read:any',
          attributes: '*',
        });
      }
    }

    this.logger.log(`Loaded ${grants.length} grants across ${roles.length} roles`);
    return new RolesBuilder(grants);
  }
}