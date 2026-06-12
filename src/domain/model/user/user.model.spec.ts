import { RoleCode } from '../role-code';
import { User } from './user.model';

describe('User', () => {
  it('normalizes user identity fields when creating a user', () => {
    const user = User.create({
      email: '  Customer@Example.COM ',
      passwordHash: ' hashed-password ',
      fullName: ' Jane Customer ',
      phone: ' +995555000111 ',
      roleCodes: [RoleCode.Customer, RoleCode.Customer],
    });

    expect(user.email).toBe('customer@example.com');
    expect(user.passwordHash).toBe('hashed-password');
    expect(user.fullName).toBe('Jane Customer');
    expect(user.phone).toBe('+995555000111');
    expect(user.isActive).toBe(true);
    expect(user.roleCodes).toEqual([RoleCode.Customer]);
  });

  it('rejects blank required fields and users without roles', () => {
    expect(() =>
      User.create({
        email: ' ',
        passwordHash: 'hashed-password',
        fullName: 'Jane Customer',
        roleCodes: [RoleCode.Customer],
      }),
    ).toThrow('email must not be blank');

    expect(() =>
      User.create({
        email: 'customer@example.com',
        passwordHash: ' ',
        fullName: 'Jane Customer',
        roleCodes: [RoleCode.Customer],
      }),
    ).toThrow('passwordHash must not be blank');

    expect(() =>
      User.create({
        email: 'customer@example.com',
        passwordHash: 'hashed-password',
        fullName: ' ',
        roleCodes: [RoleCode.Customer],
      }),
    ).toThrow('fullName must not be blank');

    expect(() =>
      User.create({
        email: 'customer@example.com',
        passwordHash: 'hashed-password',
        fullName: 'Jane Customer',
        roleCodes: [],
      }),
    ).toThrow('user must have at least one role');
  });
});
