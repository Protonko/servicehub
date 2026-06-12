import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthenticatedActor } from '@application/auth';
import { RoleCode } from '@domain/model';
import { ROLES_KEY } from '../decorators/roles.decorator';

interface RequestWithUser {
  user?: AuthenticatedActor;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<RoleCode[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const actor = request.user;

    if (!actor || !requiredRoles.some((role) => actor.roles.includes(role))) {
      throw new ForbiddenException('User does not have the required role');
    }

    return true;
  }
}
