import { Permission } from '@modules/core/entities/permission.entity';
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { PERMISSIONS_KEY } from '@shared/decorators/permissions.decorator';
import { Repository } from 'typeorm';


@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(Permission) private permRepo: Repository<Permission>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY, [ctx.getHandler(), ctx.getClass()],
    );
    if (!required?.length) return true;

    const { user } = ctx.switchToHttp().getRequest();
    if (!user?.roleId) throw new ForbiddenException('Access denied');

    const granted = await this.permRepo.find({
      where: { roleId: user.roleId, status: true },
    });
    const grantedNames = new Set(granted.map((p) => p.name));

    const ok = required.every((p) => grantedNames.has(p));
    if (!ok) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}