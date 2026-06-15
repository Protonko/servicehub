import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { RoleCode } from '@domain/model';
import { AuthTokenService } from '@contract/auth';
import { JwtAuthGuard } from '../jwt-auth.guard';

const createContext = (request: Record<string, unknown>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as ExecutionContext;

describe('JwtAuthGuard', () => {
  it('attaches authenticated actor for a valid access cookie', () => {
    const authTokenService = {
      issueTokens: jest.fn(),
      verifyToken: jest.fn(() => ({
        sub: 'user-id',
        roles: [RoleCode.Customer],
        purpose: 'access',
      })),
    } as unknown as jest.Mocked<AuthTokenService>;
    const request = {
      headers: {
        cookie: 'access_token=valid-token',
      },
    };
    const guard = new JwtAuthGuard(authTokenService);

    expect(guard.canActivate(createContext(request))).toBe(true);
    expect(request).toMatchObject({
      user: {
        userId: 'user-id',
        roles: [RoleCode.Customer],
      },
    });
  });

  it('rejects missing or invalid access cookies', () => {
    const authTokenService = {
      issueTokens: jest.fn(),
      verifyToken: jest.fn(() => {
        throw new Error('bad token');
      }),
    } as unknown as jest.Mocked<AuthTokenService>;
    const guard = new JwtAuthGuard(authTokenService);

    expect(() =>
      guard.canActivate(
        createContext({
          headers: {},
        }),
      ),
    ).toThrow(UnauthorizedException);

    expect(() =>
      guard.canActivate(
        createContext({
          headers: {
            cookie: 'access_token=bad-token',
          },
        }),
      ),
    ).toThrow(UnauthorizedException);
  });
});
