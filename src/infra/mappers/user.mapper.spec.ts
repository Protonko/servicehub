import { RoleCode } from '@domain/model';
import { User } from '@domain/model';
import { RoleEntity } from '@db/entities/role.entity';
import { UserRoleEntity } from '@db/entities/user-role.entity';
import { UserEntity } from '@db/entities/user.entity';
import { UserMapper } from './user.mapper';

describe('UserMapper', () => {
  it('maps user persistence data to a domain user', () => {
    const role = new RoleEntity();
    role.id = 'role-id';
    role.code = RoleCode.Customer;
    role.name = 'Customer';

    const userRole = new UserRoleEntity();
    userRole.userId = 'user-id';
    userRole.roleId = 'role-id';
    userRole.role = role;

    const entity = new UserEntity();
    entity.id = 'user-id';
    entity.email = 'customer@example.com';
    entity.passwordHash = 'hashed-password';
    entity.fullName = 'Jane Customer';
    entity.phone = null;
    entity.isActive = true;
    entity.createdAt = new Date('2026-06-11T10:00:00.000Z');
    entity.updatedAt = new Date('2026-06-11T10:05:00.000Z');
    entity.userRoles = [userRole];

    const user = UserMapper.toDomain(entity);

    expect(user.id).toBe('user-id');
    expect(user.email).toBe('customer@example.com');
    expect(user.passwordHash).toBe('hashed-password');
    expect(user.fullName).toBe('Jane Customer');
    expect(user.phone).toBeNull();
    expect(user.isActive).toBe(true);
    expect(user.roleCodes).toEqual([RoleCode.Customer]);
    expect(user.createdAt).toEqual(entity.createdAt);
    expect(user.updatedAt).toEqual(entity.updatedAt);
  });

  it('maps a domain user to user persistence fields', () => {
    const user = User.create({
      email: 'customer@example.com',
      passwordHash: 'hashed-password',
      fullName: 'Jane Customer',
      phone: null,
      roleCodes: [RoleCode.Customer],
    });

    const entity = UserMapper.toEntity(user);

    expect(entity).toMatchObject({
      id: user.id,
      email: 'customer@example.com',
      passwordHash: 'hashed-password',
      fullName: 'Jane Customer',
      phone: null,
      isActive: true,
    });
  });
});
