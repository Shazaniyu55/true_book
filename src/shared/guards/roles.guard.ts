import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../types/enums';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Access denied');

    const hasRole = requiredRoles.some((role) => {
      // Admin area: admit ANY admin-table user (super admin + sub-admins such as
      // support, finance, etc.), not just the literal 'admin' role. Fine-grained
      // access is then enforced by PermissionsGuard via @RequirePermissions.
      if (role === UserRole.ADMIN) {
        return user.type === 'admin' || user.role === UserRole.ADMIN;
      }
      return user.role === role;
    });

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required role(s): [${requiredRoles.join(', ')}]`,
      );
    }
    return true;
  }
}
// import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { ROLES_KEY } from '../decorators/roles.decorator';
// import { UserRole } from '../../types/enums';

// @Injectable()
// export class RolesGuard implements CanActivate {
//   constructor(private reflector: Reflector) {}

//   canActivate(context: ExecutionContext): boolean {
//     const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
//       context.getHandler(),
//       context.getClass(),
//     ]);
//     if (!requiredRoles || requiredRoles.length === 0) return true;

//     const { user } = context.switchToHttp().getRequest();
//     if (!user) throw new ForbiddenException('Access denied');

//     const hasRole = requiredRoles.some((role) => user.role === role);
//     if (!hasRole) {
//       throw new ForbiddenException(
//         `Access denied. Required role(s): [${requiredRoles.join(', ')}]`,
//       );
//     }
//     return true;
//   }
// }
