import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoleEntity } from '@db/entities/role.entity';
import { UserRoleEntity } from '@db/entities/user-role.entity';
import { UserEntity } from '@db/entities/user.entity';
import { AUTH_TOKEN_SERVICE, PASSWORD_HASHER } from '@contract/auth';
import { USER_REPOSITORY } from '@domain/repositories';
import { HmacJwtTokenService } from './auth/hmac-jwt-token.service';
import { ScryptPasswordHasher } from './auth/scrypt-password-hasher';
import { QueueModule } from './queues/queue.module';
import { UserTypeOrmRepository } from './repositories/user.typeorm-repository';

@Module({
  imports: [QueueModule, TypeOrmModule.forFeature([UserEntity, RoleEntity, UserRoleEntity])],
  providers: [
    UserTypeOrmRepository,
    ScryptPasswordHasher,
    HmacJwtTokenService,
    {
      provide: USER_REPOSITORY,
      useExisting: UserTypeOrmRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useExisting: ScryptPasswordHasher,
    },
    {
      provide: AUTH_TOKEN_SERVICE,
      useExisting: HmacJwtTokenService,
    },
  ],
  exports: [QueueModule, USER_REPOSITORY, PASSWORD_HASHER, AUTH_TOKEN_SERVICE],
})
export class InfraModule {}
