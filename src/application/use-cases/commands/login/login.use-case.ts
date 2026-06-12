import { Inject, Injectable } from '@nestjs/common';

import { USER_REPOSITORY, UserRepository } from '@domain/repositories';
import {
  AUTH_TOKEN_SERVICE,
  AuthTokenService,
  IssuedAuthTokens,
  PASSWORD_HASHER,
  PasswordHasher,
} from '@contract/auth';
import { InactiveUserError, InvalidCredentialsError } from '@application/errors';
import { AuthUserSummary, toAuthUserSummary } from '@application/read-models';

export interface LoginCommand {
  email: string;
  password: string;
}

export interface LoginResult {
  user: AuthUserSummary;
  tokens: IssuedAuthTokens;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(AUTH_TOKEN_SERVICE) private readonly authTokenService: AuthTokenService,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(command.email);

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.verify(command.password, user.passwordHash);

    if (!passwordMatches) {
      throw new InvalidCredentialsError();
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
