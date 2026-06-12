import { Inject, Injectable } from '@nestjs/common';

import { RoleCode, User } from '@domain/model';
import { USER_REPOSITORY, UserRepository } from '@domain/repositories';
import { PASSWORD_HASHER, PasswordHasher } from '@contract/auth';
import { DuplicateEmailError } from '@application/errors';
import { AuthUserSummary, toAuthUserSummary } from '@application/read-models';

export interface RegisterCustomerCommand {
  email: string;
  password: string;
  fullName: string;
  phone?: string | null;
}

export interface RegisterCustomerResult {
  user: AuthUserSummary;
}

@Injectable()
export class RegisterCustomerUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(command: RegisterCustomerCommand): Promise<RegisterCustomerResult> {
    const existingUser = await this.userRepository.findByEmail(command.email);

    if (existingUser) {
      throw new DuplicateEmailError();
    }

    const passwordHash = await this.passwordHasher.hash(command.password);
    const user = User.create({
      email: command.email,
      passwordHash,
      fullName: command.fullName,
      phone: command.phone,
      roleCodes: [RoleCode.Customer],
    });
    const savedUser = await this.userRepository.save(user);

    return {
      user: toAuthUserSummary(savedUser),
    };
  }
}
