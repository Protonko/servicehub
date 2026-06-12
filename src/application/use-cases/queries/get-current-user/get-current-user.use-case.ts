import { Inject, Injectable } from '@nestjs/common';

import { USER_REPOSITORY, UserRepository } from '@domain/repositories';
import { InactiveUserError, UnauthenticatedError } from '@application/errors';
import { AuthUserSummary, toAuthUserSummary } from '@application/read-models';

export interface GetCurrentUserResult {
  user: AuthUserSummary;
}

@Injectable()
export class GetCurrentUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async execute(userId: string): Promise<GetCurrentUserResult> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UnauthenticatedError('User no longer exists');
    }

    if (!user.isActive) {
      throw new InactiveUserError();
    }

    return {
      user: toAuthUserSummary(user),
    };
  }
}
