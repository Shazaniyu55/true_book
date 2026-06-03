import { SetMetadata } from '@nestjs/common';
import { Permission } from 'src/types/enums/permission.enums';

export const PERMISSIONS_KEY = 'required_permissions';
export const RequirePermissions = (...perms: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, perms);