import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';

import { ACCESS_TOKEN_COOKIE } from '@application/auth';
import {
  AUTH_TOKEN_SERVICE,
  AuthTokenService,
} from '@contract/auth';
import { AuthenticatedActor } from '@application/auth';
import { isRoleCode } from '@domain/model';
import { getCookie } from '../cookies/auth-cookie.helper';

interface AuthenticatedRequest {
  headers: {
    cookie?: string;
  };
  user?: AuthenticatedActor;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(AUTH_TOKEN_SERVICE) private readonly authTokenService: AuthTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = getCookie(request.headers.cookie, ACCESS_TOKEN_COOKIE);

    if (!accessToken) {
      throw new UnauthorizedException('Authentication is required');
    }

    try {
      const payload = this.authTokenService.verifyToken(accessToken, 'access');

      if (!payload.roles.every(isRoleCode)) {
        throw new Error('Invalid roles');
      }

      request.user = {
        userId: payload.sub,
        roles: payload.roles,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Authentication is required');
    }
  }
}
