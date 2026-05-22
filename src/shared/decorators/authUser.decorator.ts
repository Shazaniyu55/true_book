// import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

// export const AuthUser = createParamDecorator((data: unknown, ctx: ExecutionContext): User => {
//   const request = ctx.switchToHttp().getRequest();
//   if (!request.user) {
//     throw new UnauthorizedException('User not authenticated');
//   }

//   return request.user as User;
// });
