import { RoleCode } from '@domain/model';
import { User } from '@domain/model';
import { UserRepository } from '@domain/repositories';
import { PasswordHasher } from '@contract/auth';
import { DuplicateEmailError } from '@application/errors';
import { RegisterCustomerUseCase } from './register-customer.use-case';

describe('RegisterCustomerUseCase', () => {
  const createDependencies = () => {
    const save = jest.fn((user: User) => Promise.resolve(user));
    const findById = jest.fn();
    const findByEmail = jest.fn<Promise<User | null>, [string]>(() => Promise.resolve(null));
    const hash = jest.fn(() => Promise.resolve('hashed-password'));
    const verify = jest.fn();
    const userRepository = {
      save,
      findById,
      findByEmail,
    } as unknown as jest.Mocked<UserRepository>;
    const passwordHasher = {
      hash,
      verify,
    } as unknown as jest.Mocked<PasswordHasher>;

    return { userRepository, passwordHasher, save, findByEmail, hash };
  };

  it('hashes the password and registers a customer user', async () => {
    const { userRepository, passwordHasher, save, hash } = createDependencies();
    const useCase = new RegisterCustomerUseCase(userRepository, passwordHasher);

    const result = await useCase.execute({
      email: 'Customer@Example.com',
      password: 'strong-password',
      fullName: 'Jane Customer',
      phone: '+995555000111',
    });

    expect(hash).toHaveBeenCalledWith('strong-password');
    expect(save).toHaveBeenCalledWith(expect.any(User));

    const savedUser = save.mock.calls[0][0];

    expect(savedUser.email).toBe('customer@example.com');
    expect(savedUser.passwordHash).toBe('hashed-password');
    expect(savedUser.passwordHash).not.toBe('strong-password');
    expect(savedUser.roleCodes).toEqual([RoleCode.Customer]);
    expect(result.user.roles).toEqual([RoleCode.Customer]);
  });

  it('rejects duplicate email before hashing', async () => {
    const { userRepository, passwordHasher, save, findByEmail, hash } = createDependencies();
    findByEmail.mockResolvedValue(
      User.create({
        email: 'customer@example.com',
        passwordHash: 'hashed-password',
        fullName: 'Jane Customer',
        roleCodes: [RoleCode.Customer],
      }),
    );
    const useCase = new RegisterCustomerUseCase(userRepository, passwordHasher);

    await expect(
      useCase.execute({
        email: 'customer@example.com',
        password: 'strong-password',
        fullName: 'Jane Customer',
      }),
    ).rejects.toThrow(DuplicateEmailError);

    expect(hash).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });
});
