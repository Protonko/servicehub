export class DuplicateEmailError extends Error {
  constructor() {
    super('Email is already registered');
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password');
  }
}

export class InactiveUserError extends Error {
  constructor() {
    super('User is inactive');
  }
}

export class UnauthenticatedError extends Error {
  constructor(message = 'Authentication is required') {
    super(message);
  }
}

export class ForbiddenRoleError extends Error {
  constructor() {
    super('User does not have the required role');
  }
}
