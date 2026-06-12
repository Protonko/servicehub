export type AuthTokenPurpose = 'access' | 'refresh';

export interface AuthTokenPayload {
  sub: string;
  roles: string[];
  purpose: AuthTokenPurpose;
}

export interface IssuedAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
export const AUTH_TOKEN_SERVICE = Symbol('AUTH_TOKEN_SERVICE');

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, passwordHash: string): Promise<boolean>;
}

export interface AuthTokenService {
  issueTokens(payload: Omit<AuthTokenPayload, 'purpose'>): IssuedAuthTokens;
  verifyToken(token: string, purpose: AuthTokenPurpose): AuthTokenPayload;
}
