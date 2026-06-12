import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { AuthenticatedActor } from '@application/auth';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedActor => {
    const request = context.switchToHttp().getRequest<{ user: AuthenticatedActor }>();

    return request.user;
  },
);
