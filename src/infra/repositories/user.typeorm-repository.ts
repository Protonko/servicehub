import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';

import { RoleCode } from '@domain/model';
import { User } from '@domain/model';
import { UserRepository } from '@domain/repositories';
import { RoleEntity } from '@db/entities/role.entity';
import { UserRoleEntity } from '@db/entities/user-role.entity';
import { UserEntity } from '@db/entities/user.entity';
import { UserMapper } from '../mappers/user.mapper';

const userRelations = {
  userRoles: {
    role: true,
  },
} as const;

export const normalizeUserEmail = (email: string): string => email.trim().toLowerCase();

@Injectable()
export class UserTypeOrmRepository implements UserRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async save(user: User): Promise<User> {
    return this.dataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(UserEntity);
      const roleRepository = manager.getRepository(RoleEntity);
      const userRoleRepository = manager.getRepository(UserRoleEntity);

      const roleCodes = user.roleCodes;
      const roles = await roleRepository.find({
        where: {
          code: In(roleCodes),
        },
      });

      this.ensureAllRolesExist(roleCodes, roles);

      await userRepository.save(UserMapper.toEntity(user));
      await userRoleRepository.delete({ userId: user.id });

      const userRoles = roles.map((role) =>
        userRoleRepository.create({
          userId: user.id,
          roleId: role.id,
        }),
      );

      await userRoleRepository.save(userRoles);

      const savedUser = await userRepository.findOneOrFail({
        where: { id: user.id },
        relations: userRelations,
      });

      return UserMapper.toDomain(savedUser);
    });
  }

  async findById(id: string): Promise<User | null> {
    const entity = await this.dataSource.getRepository(UserEntity).findOne({
      where: { id },
      relations: userRelations,
    });

    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.dataSource.getRepository(UserEntity).findOne({
      where: { email: normalizeUserEmail(email) },
      relations: userRelations,
    });

    return entity ? UserMapper.toDomain(entity) : null;
  }

  private ensureAllRolesExist(roleCodes: RoleCode[], roles: RoleEntity[]): void {
    const foundRoleCodes = new Set(roles.map((role) => role.code));
    const missingRoleCodes = roleCodes.filter((roleCode) => !foundRoleCodes.has(roleCode));

    if (missingRoleCodes.length > 0) {
      throw new Error(`Unknown role code(s): ${missingRoleCodes.join(', ')}`);
    }
  }
}
