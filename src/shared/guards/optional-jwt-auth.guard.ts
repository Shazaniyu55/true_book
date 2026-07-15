import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * Runs the JWT strategy if an Authorization header is present, but never
 * rejects the request. Authenticated requests get `request.user` populated
 * (same payload shape as JwtAuthGuard); guests pass through with no user.
 *
 * Use together with @Public() so the global JwtAuthGuard doesn't 401 guests
 * before this guard runs:
 *
 *   @Public()
 *   @UseGuards(OptionalJwtAuthGuard)
 *   @Post()
 *   create(@OptionalAuthUser() user?: any) { ... }
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    // No token at all — skip passport entirely, treat as guest
    if (!request.headers?.authorization) return true;

    // Token present — let passport validate it (invalid/expired tokens are
    // still treated as guests via handleRequest below)
    return super.canActivate(context);
  }

  // Never throw — a missing/invalid user just means "guest"
  handleRequest(err: any, user: any) {
    return user || null;
  }
}