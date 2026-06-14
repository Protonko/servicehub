import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoleEntity } from '@db/entities/role.entity';
import { UserRoleEntity } from '@db/entities/user-role.entity';
import { UserEntity } from '@db/entities/user.entity';
import { AUTH_TOKEN_SERVICE, PASSWORD_HASHER } from '@contract/auth';
import { SERVICE_CATALOG_READ_QUERY } from '@application/queries/service-catalog-read.query';
import { SERVICE_CATALOG_ADMIN_REPOSITORY, USER_REPOSITORY } from '@domain/repositories';
import { HmacJwtTokenService } from './auth/hmac-jwt-token.service';
import { ScryptPasswordHasher } from './auth/scrypt-password-hasher';
import { QueueModule } from './queues/queue.module';
import { ServiceCatalogTypeOrmReadQuery } from './queries/service-catalog.typeorm-read-query';
import { ServiceCatalogAdminTypeOrmRepository } from './repositories/service-catalog-admin.typeorm-repository';
import { UserTypeOrmRepository } from './repositories/user.typeorm-repository';
import { ServiceCategoryEntity } from '@db/entities/service-category.entity';
import { ServiceTypeRequiredSkillEntity } from '@db/entities/service-type-required-skill.entity';
import { ServiceTypeEntity } from '@db/entities/service-type.entity';
import { SkillEntity } from '@db/entities/skill.entity';
import { SlaPolicyEntity } from '@db/entities/sla-policy.entity';

@Module({
  imports: [
    QueueModule,
    TypeOrmModule.forFeature([
      UserEntity,
      RoleEntity,
      UserRoleEntity,
      ServiceCategoryEntity,
      SkillEntity,
      SlaPolicyEntity,
      ServiceTypeEntity,
      ServiceTypeRequiredSkillEntity,
    ]),
  ],
  providers: [
    UserTypeOrmRepository,
    ServiceCatalogAdminTypeOrmRepository,
    ServiceCatalogTypeOrmReadQuery,
    ScryptPasswordHasher,
    HmacJwtTokenService,
    {
      provide: USER_REPOSITORY,
      useExisting: UserTypeOrmRepository,
    },
    {
      provide: SERVICE_CATALOG_ADMIN_REPOSITORY,
      useExisting: ServiceCatalogAdminTypeOrmRepository,
    },
    {
      provide: SERVICE_CATALOG_READ_QUERY,
      useExisting: ServiceCatalogTypeOrmReadQuery,
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
  exports: [
    QueueModule,
    USER_REPOSITORY,
    SERVICE_CATALOG_ADMIN_REPOSITORY,
    SERVICE_CATALOG_READ_QUERY,
    PASSWORD_HASHER,
    AUTH_TOKEN_SERVICE,
  ],
})
export class InfraModule {}
