import { ConfigService } from '@nestjs/config';

import { RoleCode } from '@domain/model';
import { DuplicateEmailError, InvalidCredentialsError } from '@application/errors';
import { AuthController } from './auth.controller';

const userSummary = {
  id: 'user-id',
  email: 'customer@example.com',
  fullName: 'Jane Customer',
  phone: null,
  roles: [RoleCode.Customer],
};

const createConfigService = (): ConfigService =>
  ({
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, unknown> = {
        'auth.secureCookies': false,
        'auth.accessTokenTtlSeconds': 900,
        'auth.refreshTokenTtlSeconds': 604800,
      };

      return values[key];
    }),
  }) as unknown as ConfigService;

describe('AuthController', () => {
  const createController = () => {
    const registerCustomerUseCase = {
      execute: jest.fn().mockResolvedValue({ user: userSummary }),
    };
    const loginUseCase = {
      execute: jest.fn().mockResolvedValue({
        user: userSummary,
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      }),
    };
    const refreshSessionUseCase = {
      execute: jest.fn().mockResolvedValue({
        user: userSummary,
        tokens: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      }),
    };
    const getCurrentUserUseCase = {
      execute: jest.fn().mockResolvedValue({ user: userSummary }),
    };
    const controller = new AuthController(
      registerCustomerUseCase as never,
      loginUseCase as never,
      refreshSessionUseCase as never,
      getCurrentUserUseCase as never,
      createConfigService(),
    );

    return {
      controller,
      registerCustomerUseCase,
      loginUseCase,
      refreshSessionUseCase,
      getCurrentUserUseCase,
    };
  };

  it('registers a customer and maps the response shape', async () => {
    const { controller } = createController();

    await expect(
      controller.register({
        email: 'customer@example.com',
        password: 'strong-password',
        fullName: 'Jane Customer',
      }),
    ).resolves.toEqual({
      data: {
        user: userSummary,
      },
    });
  });

  it('maps duplicate registration to conflict response', async () => {
    const { controller, registerCustomerUseCase } = createController();
    registerCustomerUseCase.execute.mockRejectedValue(new DuplicateEmailError());

    await expect(
      controller.register({
        email: 'customer@example.com',
        password: 'strong-password',
        fullName: 'Jane Customer',
      }),
    ).rejects.toMatchObject({
      status: 409,
    });
  });

  it('sets auth cookies on login', async () => {
    const { controller } = createController();
    const response = {
      setHeader: jest.fn(),
    };

    await controller.login(
      {
        email: 'customer@example.com',
        password: 'strong-password',
      },
      response,
    );

    expect(response.setHeader).toHaveBeenCalledWith('Set-Cookie', [
      expect.stringContaining('access_token=access-token'),
      expect.stringContaining('refresh_token=refresh-token'),
    ]);
    expect(response.setHeader.mock.calls[0][1][0]).toContain('HttpOnly');
  });

  it('maps invalid login to unauthorized response', async () => {
    const { controller, loginUseCase } = createController();
    loginUseCase.execute.mockRejectedValue(new InvalidCredentialsError());

    await expect(
      controller.login(
        {
          email: 'customer@example.com',
          password: 'wrong-password',
        },
        { setHeader: jest.fn() },
      ),
    ).rejects.toMatchObject({
      status: 401,
    });
  });

  it('refreshes access cookie from refresh cookie', async () => {
    const { controller, refreshSessionUseCase } = createController();
    const response = {
      setHeader: jest.fn(),
    };

    await controller.refresh(
      {
        headers: {
          cookie: 'refresh_token=refresh-token',
        },
      },
      response,
    );

    expect(refreshSessionUseCase.execute).toHaveBeenCalledWith('refresh-token');
    expect(response.setHeader).toHaveBeenCalledWith('Set-Cookie', [
      expect.stringContaining('access_token=new-access-token'),
    ]);
  });

  it('clears auth cookies on logout', () => {
    const { controller } = createController();
    const response = {
      setHeader: jest.fn(),
    };

    controller.logout(response);

    expect(response.setHeader).toHaveBeenCalledWith('Set-Cookie', [
      expect.stringContaining('access_token='),
      expect.stringContaining('refresh_token='),
    ]);
    expect(response.setHeader.mock.calls[0][1][0]).toContain('Max-Age=0');
  });
});
