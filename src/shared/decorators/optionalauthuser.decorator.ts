import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Like @AuthUser(), but does NOT throw when the request is unauthenticated.
 * Returns the JWT payload ({ id, sub, email, role, ... }) or undefined.
 * Pair with OptionalJwtAuthGuard on routes that serve both guests and
 * logged-in users.
 */
export const OptionalAuthUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user ?? undefined;
  },
);