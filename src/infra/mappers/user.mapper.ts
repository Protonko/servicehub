import { isRoleCode } from '@domain/model';
import { User } from '@domain/model';
import { UserEntity } from '@db/entities/user.entity';

export class UserMapper {
  static toDomain(entity: UserEntity): User {
    const roleCodes = (entity.userRoles ?? []).map((userRole) => {
      const code = userRole.role.code;

      if (!isRoleCode(code)) {
        throw new Error(`Unknown role code: ${code}`);
      }

      return code;
    });

    return User.rehydrate({
      id: entity.id,
      email: entity.email,
      passwordHash: entity.passwordHash,
      fullName: entity.fullName,
      phone: entity.phone,
      isActive: entity.isActive,
      roleCodes,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(user: User): UserEntity {
    const entity = new UserEntity();

    entity.id = user.id;
    entity.email = user.email;
    entity.passwordHash = user.passwordHash;
    entity.fullName = user.fullName;
    entity.phone = user.phone;
    entity.isActive = user.isActive;

    return entity;
  }
}
