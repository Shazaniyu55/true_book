import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolesBuilder } from 'nest-access-control';
import { Role } from '@modules/core/entities/role.entity';

@Injectable()
export class AcGrantsService {
  private readonly logger = new Logger(AcGrantsService.name);

  /**
   * Holds the SAME RolesBuilder instance that NestJS injects into
   * PermissionsGuard (via AccessControlModule.forRootAsync → build()).
   * refresh() mutates this instance in place so permission changes take
   * effect immediately, without a server restart.
   */
  private builder?: RolesBuilder;

  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
  ) {}

  /**
   * Reads roles + their active permissions from the DB and flattens them into
   * accesscontrol grant rows. Each permission string (e.g. 'payout:approve')
   * becomes a resource with read:any — preserving your flat-permission semantics.
   */
  private async computeGrants(): Promise<any[]> {
    const roles = await this.roleRepo.find({ relations: ['permissions'] });
    const grants: any[] = [];

    for (const role of roles) {
      const active = (role.permissions ?? []).filter((p) => p.status);
      for (const perm of active) {
        grants.push({
          role: role.name,
          resource: perm.name, // e.g. 'payout:approve'
          action: 'read:any',
          attributes: '*',
        });
      }
    }

    return grants;
  }

  /**
   * Builds the RolesBuilder once at bootstrap and stores the reference.
   * Called by AccessControlModule.forRootAsync's useFactory.
   */
  async build(): Promise<RolesBuilder> {
    const grants = await this.computeGrants();
    this.builder = new RolesBuilder(grants);
    this.logger.log(`Loaded ${grants.length} grants`);
    return this.builder;
  }

  /**
   * Recomputes grants from the DB and mutates the SAME RolesBuilder instance
   * the guard already holds. Call this after any role/permission change
   * (e.g. at the end of RolesService.updateRole).
   *
   * Note: accesscontrol's setGrants throws on an empty grants array, so we
   * guard against it. If every permission has been removed, we reset to a
   * single inert grant that can never match a real resource, which safely
   * denies everything until permissions are reassigned.
   */
  async refresh(): Promise<void> {
    if (!this.builder) {
      // Builder not initialised yet (refresh called before bootstrap) — build it.
      await this.build();
      return;
    }

    const grants = await this.computeGrants();

    if (grants.length) {
      this.builder.setGrants(grants);
      this.logger.log(`Refreshed ${grants.length} grants`);
    } else {
      // Empty set: keep the builder valid but grant nothing real.
      this.builder.setGrants([
        {
          role: '__none__',
          resource: '__none__',
          action: 'read:any',
          attributes: '*',
        },
      ]);
      this.logger.warn('Refreshed grants: no active permissions found (all access denied)');
    }
  }
}

// // src/shared/access-control/ac-grants.service.ts
// import { Injectable, Logger } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { RolesBuilder } from 'nest-access-control';
// import { Role } from '@modules/core/entities/role.entity';

// @Injectable()
// export class AcGrantsService {
//   private readonly logger = new Logger(AcGrantsService.name);
//   private builder?: RolesBuilder;

//   constructor(
//     @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
//   ) {}

//   /**
//    * Reads roles + their active permissions from the DB and produces a
//    * RolesBuilder. Each permission string (e.g. 'payout:approve') becomes a
//    * resource with read:any — preserving your flat-permission semantics.
//    */
//   async build(): Promise<RolesBuilder> {
//   this.builder = new RolesBuilder(await this.computeGrants());
//   return this.builder;
// }
//   // async build(): Promise<RolesBuilder> {
//   //   const roles = await this.roleRepo.find({ relations: ['permissions'] });
//   //   const grants: any[] = [];

//   //   for (const role of roles) {
//   //     const active = (role.permissions ?? []).filter((p) => p.status);
//   //     for (const perm of active) {
//   //       grants.push({
//   //         role: role.name,
//   //         resource: perm.name,   // e.g. 'payout:approve'
//   //         action: 'read:any',
//   //         attributes: '*',
//   //       });
//   //     }
//   //   }

//   //   this.logger.log(`Loaded ${grants.length} grants across ${roles.length} roles`);
//   //   return new RolesBuilder(grants);
//   // }

//   private async computeGrants(): Promise<any[]> {
//   const roles = await this.roleRepo.find({ relations: ['permissions'] });
//   const grants: any[] = [];
//   for (const role of roles)
//     for (const perm of (role.permissions ?? []).filter((p) => p.status))
//       grants.push({ role: role.name, resource: perm.name, action: 'read:any', attributes: '*' });
//   return grants;
// }



// async refresh(): Promise<void> {
//   const grants = await this.computeGrants();
//   // setGrants mutates the SAME instance the guard already holds.
//   // Note: accesscontrol throws on an empty grants array — guard against it.
//   if (this.builder && grants.length) this.builder.setGrants(grants);
// }
// }