import { ConfigService } from '@nestjs/config';

import {
  ACCESS_TOKEN_COOKIE,
  AuthCookieOptions,
  REFRESH_TOKEN_COOKIE,
} from '@application/auth';
import { IssuedAuthTokens } from '@contract/auth';

interface HeaderResponse {
  setHeader(name: string, value: string | string[]): void;
}

export const parseCookies = (cookieHeader: string | undefined): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, part) => {
    const [name, ...valueParts] = part.trim().split('=');

    if (name && valueParts.length > 0) {
      cookies[name] = decodeURIComponent(valueParts.join('='));
    }

    return cookies;
  }, {});
};

export const getCookie = (cookieHeader: string | undefined, name: string): string | undefined =>
  parseCookies(cookieHeader)[name];

export const createAuthCookieOptions = (
  configService: ConfigService,
  maxAgeSeconds: number,
): AuthCookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: configService.getOrThrow<boolean>('auth.secureCookies'),
  path: '/',
  maxAge: maxAgeSeconds,
});

export const serializeCookie = (
  name: string,
  value: string,
  options: AuthCookieOptions,
): string => {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'HttpOnly',
    `SameSite=${options.sameSite}`,
    `Path=${options.path}`,
    `Max-Age=${options.maxAge}`,
  ];

  if (options.secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
};

export const setAuthCookies = (
  response: HeaderResponse,
  configService: ConfigService,
  tokens: IssuedAuthTokens,
): void => {
  const accessCookie = serializeCookie(
    ACCESS_TOKEN_COOKIE,
    tokens.accessToken,
    createAuthCookieOptions(
      configService,
      configService.getOrThrow<number>('auth.accessTokenTtlSeconds'),
    ),
  );
  const refreshCookie = serializeCookie(
    REFRESH_TOKEN_COOKIE,
    tokens.refreshToken,
    createAuthCookieOptions(
      configService,
      configService.getOrThrow<number>('auth.refreshTokenTtlSeconds'),
    ),
  );

  response.setHeader('Set-Cookie', [accessCookie, refreshCookie]);
};

export const setAccessCookie = (
  response: HeaderResponse,
  configService: ConfigService,
  accessToken: string,
): void => {
  response.setHeader('Set-Cookie', [
    serializeCookie(
      ACCESS_TOKEN_COOKIE,
      accessToken,
      createAuthCookieOptions(
        configService,
        configService.getOrThrow<number>('auth.accessTokenTtlSeconds'),
      ),
    ),
  ]);
};

export const clearAuthCookies = (response: HeaderResponse, configService: ConfigService): void => {
  const options = createAuthCookieOptions(configService, 0);

  response.setHeader('Set-Cookie', [
    serializeCookie(ACCESS_TOKEN_COOKIE, '', options),
    serializeCookie(REFRESH_TOKEN_COOKIE, '', options),
  ]);
};
