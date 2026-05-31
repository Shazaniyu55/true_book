// src/shared/access-control/access-control.module.ts
import { Global, Module } from '@nestjs/common';
import { AccessControlModule, RolesBuilder } from 'nest-access-control';
import { AcGrantsModule } from './ac-grants.module';
import { AcGrantsService } from './ac-grants.service';

@Global()
@Module({
  imports: [
    AccessControlModule.forRootAsync({
      imports: [AcGrantsModule],
      inject: [AcGrantsService],
      useFactory: (grants: AcGrantsService): Promise<RolesBuilder> =>
        grants.build(),
    }),
  ],
  exports: [AccessControlModule],
})
export class AppAccessControlModule {}