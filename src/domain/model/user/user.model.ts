import { randomUUID } from 'node:crypto';

import { requireNonBlankString } from '@common/utils/require-non-blank-string';

import { CreateUserInput, UserProps } from './user.props';

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const normalizeRoles = (roleCodes: UserProps['roleCodes']): UserProps['roleCodes'] => {
  const uniqueRoleCodes = [...new Set(roleCodes)];

  if (uniqueRoleCodes.length === 0) {
    throw new Error('user must have at least one role');
  }

  return uniqueRoleCodes;
};

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(input: CreateUserInput): User {
    return new User({
      id: randomUUID(),
      email: requireNonBlankString(normalizeEmail(input.email), 'email'),
      passwordHash: requireNonBlankString(input.passwordHash, 'passwordHash'),
      fullName: requireNonBlankString(input.fullName, 'fullName'),
      phone: input.phone?.trim() || null,
      isActive: true,
      roleCodes: normalizeRoles(input.roleCodes),
    });
  }

  static rehydrate(props: UserProps): User {
    return new User({
      ...props,
      email: requireNonBlankString(normalizeEmail(props.email), 'email'),
      passwordHash: requireNonBlankString(props.passwordHash, 'passwordHash'),
      fullName: requireNonBlankString(props.fullName, 'fullName'),
      phone: props.phone?.trim() || null,
      roleCodes: normalizeRoles(props.roleCodes),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get fullName(): string {
    return this.props.fullName;
  }

  get phone(): string | null {
    return this.props.phone;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get roleCodes(): UserProps['roleCodes'] {
    return [...this.props.roleCodes];
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }
}
