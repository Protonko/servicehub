import { randomUUID } from 'node:crypto';

import { CreateUserInput, UserProps } from './user.props';

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const requireNonBlank = (value: string, fieldName: string): string => {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${fieldName} must not be blank`);
  }

  return trimmed;
};

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
      email: requireNonBlank(normalizeEmail(input.email), 'email'),
      passwordHash: requireNonBlank(input.passwordHash, 'passwordHash'),
      fullName: requireNonBlank(input.fullName, 'fullName'),
      phone: input.phone?.trim() || null,
      isActive: true,
      roleCodes: normalizeRoles(input.roleCodes),
    });
  }

  static rehydrate(props: UserProps): User {
    return new User({
      ...props,
      email: requireNonBlank(normalizeEmail(props.email), 'email'),
      passwordHash: requireNonBlank(props.passwordHash, 'passwordHash'),
      fullName: requireNonBlank(props.fullName, 'fullName'),
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
