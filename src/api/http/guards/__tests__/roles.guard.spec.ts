import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RoleCode } from '@domain/model';
import { RolesGuard } from '../roles.guard';

const createContext = (request: Record<string, unknown>): ExecutionContext =>
  ({
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  it('allows a user with a required role', () => {
    const reflector: jest.Mocked<Reflector> = {
      getAllAndOverride: jest.fn(() => [RoleCode.Dispatcher]),
    } as unknown as jest.Mocked<Reflector>;
    const guard = new RolesGuard(reflector);

    expect(
      guard.canActivate(
        createContext({
          user: {
            userId: 'user-id',
            roles: [RoleCode.Dispatcher],
          },
        }),
      ),
    ).toBe(true);
  });

  it('rejects a user without a required role', () => {
    const reflector: jest.Mocked<Reflector> = {
      getAllAndOverride: jest.fn(() => [RoleCode.Admin]),
    } as unknown as jest.Mocked<Reflector>;
    const guard = new RolesGuard(reflector);

    expect(() =>
      guard.canActivate(
        createContext({
          user: {
            userId: 'user-id',
            roles: [RoleCode.Customer],
          },
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
