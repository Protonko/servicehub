import { RoleCode } from '@domain/model';
import { User } from '@domain/model';
import { UserRepository } from '@domain/repositories';
import { InactiveUserError, UnauthenticatedError } from '@application/errors';
import { GetCurrentUserUseCase } from './get-current-user.use-case';

describe('GetCurrentUserUseCase', () => {
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

  it('returns the active current user', async () => {
    const userRepository = {
      save: jest.fn(),
      findById: jest.fn(() => Promise.resolve(createUser())),
      findByEmail: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;
    const useCase = new GetCurrentUserUseCase(userRepository);

    const result = await useCase.execute('user-id');

    expect(result.user.email).toBe('customer@example.com');
    expect(result.user.roles).toEqual([RoleCode.Customer]);
  });

  it('rejects a missing current user', async () => {
    const userRepository = {
      save: jest.fn(),
      findById: jest.fn(() => Promise.resolve(null)),
      findByEmail: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;
    const useCase = new GetCurrentUserUseCase(userRepository);

    await expect(useCase.execute('missing-user-id')).rejects.toThrow(UnauthenticatedError);
  });

  it('rejects an inactive current user', async () => {
    const userRepository = {
      save: jest.fn(),
      findById: jest.fn(() => Promise.resolve(createUser(false))),
      findByEmail: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;
    const useCase = new GetCurrentUserUseCase(userRepository);

    await expect(useCase.execute('user-id')).rejects.toThrow(InactiveUserError);
  });
});
