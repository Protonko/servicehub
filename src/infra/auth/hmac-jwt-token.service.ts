import { createHmac, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  AuthTokenPayload,
  AuthTokenPurpose,
  AuthTokenService,
  IssuedAuthTokens,
} from '@contract/auth';

interface JwtPayload extends AuthTokenPayload {
  exp: number;
}

const encodeBase64Url = (value: Buffer | string): string =>
  Buffer.from(value).toString('base64url');

const decodeJson = <T>(value: string): T =>
  JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;

@Injectable()
export class HmacJwtTokenService implements AuthTokenService {
  private readonly secret: string;
  private readonly accessTokenTtlSeconds: number;
  private readonly refreshTokenTtlSeconds: number;

  constructor(configService: ConfigService) {
    this.secret = configService.getOrThrow<string>('auth.jwtSecret');
    this.accessTokenTtlSeconds = configService.getOrThrow<number>('auth.accessTokenTtlSeconds');
    this.refreshTokenTtlSeconds = configService.getOrThrow<number>('auth.refreshTokenTtlSeconds');
  }

  issueTokens(payload: Omit<AuthTokenPayload, 'purpose'>): IssuedAuthTokens {
    return {
      accessToken: this.sign({ ...payload, purpose: 'access' }, this.accessTokenTtlSeconds),
      refreshToken: this.sign({ ...payload, purpose: 'refresh' }, this.refreshTokenTtlSeconds),
    };
  }

  verifyToken(token: string, purpose: AuthTokenPurpose): AuthTokenPayload {
    const [encodedHeader, encodedPayload, signature] = token.split('.');

    if (!encodedHeader || !encodedPayload || !signature) {
      throw new Error('Invalid token');
    }

    const expectedSignature = this.signValue(`${encodedHeader}.${encodedPayload}`);

    if (!this.safeEqual(signature, expectedSignature)) {
      throw new Error('Invalid token signature');
    }

    const payload = decodeJson<JwtPayload>(encodedPayload);

    if (payload.purpose !== purpose) {
      throw new Error('Invalid token purpose');
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new Error('Expired token');
    }

    return {
      sub: payload.sub,
      roles: payload.roles,
      purpose: payload.purpose,
    };
  }

  private sign(payload: AuthTokenPayload, ttlSeconds: number): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };
    const jwtPayload: JwtPayload = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    };
    const encodedHeader = encodeBase64Url(JSON.stringify(header));
    const encodedPayload = encodeBase64Url(JSON.stringify(jwtPayload));
    const signature = this.signValue(`${encodedHeader}.${encodedPayload}`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private signValue(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }

  private safeEqual(actual: string, expected: string): boolean {
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);

    return (
      actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }
}
