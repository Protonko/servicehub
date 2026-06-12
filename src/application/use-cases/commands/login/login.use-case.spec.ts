import { RoleCode } from '@domain/model';
import { User } from '@domain/model';
import { UserRepository } from '@domain/repositories';
import { AuthTokenService, PasswordHasher } from '@contract/auth';
import { InactiveUserError, InvalidCredentialsError } from '@application/errors';
import { LoginUseCase } from './login.use-case';

describe('LoginUseCase', () => {
  const createUser = (isActive = true) =>
    User.rehydrate({
      id: 'user-id',
      email: 'customer@example.com',
      passwordHash: 'hashed-password',
      fullName: 'Jane Customer',
      phone: null,
      isActive,
      roleCodes: [RoleCode.Customer],
    });

  const createDependencies = () => {
    const save = jest.fn();
    const findById = jest.fn();
    const findByEmail = jest.fn(() => Promise.resolve(createUser()));
    const hash = jest.fn();
    const verify = jest.fn(() => Promise.resolve(true));
    const issueTokens = jest.fn(() => ({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    }));
    const verifyToken = jest.fn();
    const userRepository = {
      save,
      findById,
      findByEmail,
    } as unknown as jest.Mocked<UserRepository>;
    const passwordHasher = {
      hash,
      verify,
    } as unknown as jest.Mocked<PasswordHasher>;
    const authTokenService = {
      issueTokens,
      verifyToken,
    } as unknown as jest.Mocked<AuthTokenService>;

    return { userRepository, passwordHasher, authTokenService, findByEmail, verify, issueTokens };
  };

  it('authenticates an active user and issues tokens', async () => {
    const { userRepository, passwordHasher, authTokenService, findByEmail, verify, issueTokens } =
      createDependencies();
    const useCase = new LoginUseCase(userRepository, passwordHasher, authTokenService);

    const result = await useCase.execute({
      email: 'Customer@Example.com',
      password: 'strong-password',
    });

    expect(findByEmail).toHaveBeenCalledWith('Customer@Example.com');
    expect(verify).toHaveBeenCalledWith('strong-password', 'hashed-password');
    expect(issueTokens).toHaveBeenCalledWith({
      sub: 'user-id',
      roles: [RoleCode.Customer],
    });
    expect(result.tokens).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('rejects invalid credentials', async () => {
    const { userRepository, passwordHasher, authTokenService, verify, issueTokens } =
      createDependencies();
    verify.mockResolvedValue(false);
    const useCase = new LoginUseCase(userRepository, passwordHasher, authTokenService);

    await expect(
      useCase.execute({
        email: 'customer@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toThrow(InvalidCredentialsError);
    expect(issueTokens).not.toHaveBeenCalled();
  });

  it('rejects inactive users', async () => {
    const { userRepository, passwordHasher, authTokenService, findByEmail, issueTokens } =
      createDependencies();
    findByEmail.mockResolvedValue(createUser(false));
    const useCase = new LoginUseCase(userRepository, passwordHasher, authTokenService);

    await expect(
      useCase.execute({
        email: 'customer@example.com',
        password: 'strong-password',
      }),
    ).rejects.toThrow(InactiveUserError);
    expect(issueTokens).not.toHaveBeenCalled();
  });
});
