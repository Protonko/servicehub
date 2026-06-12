import { RoleCode } from '@domain/model';
import { User } from '@domain/model';
import { UserRepository } from '@domain/repositories';
import { AuthTokenService } from '@contract/auth';
import { UnauthenticatedError } from '@application/errors';
import { RefreshSessionUseCase } from './refresh-session.use-case';

describe('RefreshSessionUseCase', () => {
  const createDependencies = () => {
    const save = jest.fn();
    const findById = jest.fn(() =>
      Promise.resolve(
        User.rehydrate({
          id: 'user-id',
          email: 'customer@example.com',
          passwordHash: 'hashed-password',
          fullName: 'Jane Customer',
          phone: null,
          isActive: true,
          roleCodes: [RoleCode.Customer],
        }),
      ),
    );
    const findByEmail = jest.fn();
    const issueTokens = jest.fn(() => ({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    }));
    const verifyToken = jest.fn(() => ({
      sub: 'user-id',
      roles: [RoleCode.Customer],
      purpose: 'refresh',
    }));
    const userRepository = {
      save,
      findById,
      findByEmail,
    } as unknown as jest.Mocked<UserRepository>;
    const authTokenService = {
      issueTokens,
      verifyToken,
    } as unknown as jest.Mocked<AuthTokenService>;

    return { userRepository, authTokenService, findById, verifyToken };
  };

  it('refreshes tokens for a valid refresh token and active user', async () => {
    const { userRepository, authTokenService, findById, verifyToken } = createDependencies();
    const useCase = new RefreshSessionUseCase(userRepository, authTokenService);

    const result = await useCase.execute('refresh-token');

    expect(verifyToken).toHaveBeenCalledWith('refresh-token', 'refresh');
    expect(findById).toHaveBeenCalledWith('user-id');
    expect(result.tokens.accessToken).toBe('new-access-token');
  });

  it('rejects invalid refresh tokens', async () => {
    const { userRepository, authTokenService, findById, verifyToken } = createDependencies();
    verifyToken.mockImplementation(() => {
      throw new Error('bad token');
    });
    const useCase = new RefreshSessionUseCase(userRepository, authTokenService);

    await expect(useCase.execute('bad-token')).rejects.toThrow(UnauthenticatedError);
    expect(findById).not.toHaveBeenCalled();
  });
});
