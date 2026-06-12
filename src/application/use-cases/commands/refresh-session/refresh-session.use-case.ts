import { Inject, Injectable } from '@nestjs/common';

import { isRoleCode } from '@domain/model';
import { USER_REPOSITORY, UserRepository } from '@domain/repositories';
import { AUTH_TOKEN_SERVICE, AuthTokenService, IssuedAuthTokens } from '@contract/auth';
import { InactiveUserError, UnauthenticatedError } from '@application/errors';
import { AuthUserSummary, toAuthUserSummary } from '@application/read-models';

export interface RefreshSessionResult {
  user: AuthUserSummary;
  tokens: IssuedAuthTokens;
}

@Injectable()
export class RefreshSessionUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(AUTH_TOKEN_SERVICE) private readonly authTokenService: AuthTokenService,
  ) {}

  async execute(refreshToken: string): Promise<RefreshSessionResult> {
    let payload: { sub: string; roles: string[] };

    try {
      payload = this.authTokenService.verifyToken(refreshToken, 'refresh');
    } catch {
      throw new UnauthenticatedError('Invalid refresh token');
    }

    if (!payload.roles.every(isRoleCode)) {
      throw new UnauthenticatedError('Invalid refresh token roles');
    }

    const user = await this.userRepository.findById(payload.sub);

    if (!user) {
      throw new UnauthenticatedError('User no longer exists');
    }

    if (!user.isActive) {
      throw new InactiveUserError();
    }

    return {
      user: toAuthUserSummary(user),
      tokens: this.authTokenService.issueTokens({
        sub: user.id,
        roles: user.roleCodes,
      }),
    };
  }
}
