import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRolesBuilder, RolesBuilder } from 'nest-access-control';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission } from 'src/types/enums/permission.enums';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRolesBuilder() private readonly roleBuilder: RolesBuilder,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Access denied');

    // Normalize to a single role string — tolerate either shape
    const role: string | undefined =
      user.role ?? (Array.isArray(user.roles) ? user.roles[0] : user.roles);
    if (!role) throw new ForbiddenException('Access denied: no role');

    // Your grants register every permission as `read:any` on resource = perm name
    const ok = required.every((perm) => {
      try {
        return this.roleBuilder.can(role).readAny(perm).granted;
      } catch {
        // role not present in the builder → deny, never crash
        return false;
      }
    });

    if (!ok) {
      throw new ForbiddenException(
        `Access denied. Required permission(s): [${required.join(', ')}]`,
      );
    }
    return true;
  }
}