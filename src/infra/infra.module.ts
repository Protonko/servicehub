import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoleEntity } from '@db/entities/role.entity';
import { AuditLogEntity } from '@db/entities/audit-log.entity';
import { OutboxEventEntity } from '@db/entities/outbox-event.entity';
import { ServiceRequestAttachmentEntity } from '@db/entities/service-request-attachment.entity';
import { ServiceRequestRequiredSkillEntity } from '@db/entities/service-request-required-skill.entity';
import { ServiceRequestEntity } from '@db/entities/service-request.entity';
import { UserRoleEntity } from '@db/entities/user-role.entity';
import { UserEntity } from '@db/entities/user.entity';
import { AUTH_TOKEN_SERVICE, PASSWORD_HASHER } from '@contract/auth';
import { SERVICE_CATALOG_READ_QUERY } from '@application/queries/service-catalog-read.query';
import { SERVICE_AREA_READ_QUERY } from '@application/queries/service-area-read.query';
import {
  CUSTOMER_ADDRESS_REPOSITORY,
  SERVICE_CATALOG_ADMIN_REPOSITORY,
  SERVICE_REQUEST_REPOSITORY,
  USER_REPOSITORY,
} from '@domain/repositories';
import { HmacJwtTokenService } from './auth/hmac-jwt-token.service';
import { ScryptPasswordHasher } from './auth/scrypt-password-hasher';
import { QueueModule } from './queues/queue.module';
import { ServiceAreaTypeOrmReadQuery } from './queries/service-area.typeorm-read-query';
import { ServiceCatalogTypeOrmReadQuery } from './queries/service-catalog.typeorm-read-query';
import { CustomerAddressTypeOrmRepository } from './repositories/customer-address.typeorm-repository';
import { ServiceCatalogAdminTypeOrmRepository } from './repositories/service-catalog-admin.typeorm-repository';
import { ServiceRequestTypeOrmRepository } from './repositories/service-request.typeorm-repository';
import { UserTypeOrmRepository } from './repositories/user.typeorm-repository';
import { CustomerAddressEntity } from '@db/entities/customer-address.entity';
import { ServiceAreaEntity } from '@db/entities/service-area.entity';
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
      ServiceAreaEntity,
      CustomerAddressEntity,
      ServiceCategoryEntity,
      SkillEntity,
      SlaPolicyEntity,
      ServiceTypeEntity,
      ServiceTypeRequiredSkillEntity,
      ServiceRequestEntity,
      ServiceRequestRequiredSkillEntity,
      ServiceRequestAttachmentEntity,
      AuditLogEntity,
      OutboxEventEntity,
    ]),
  ],
  providers: [
    UserTypeOrmRepository,
    ServiceCatalogAdminTypeOrmRepository,
    ServiceRequestTypeOrmRepository,
    ServiceCatalogTypeOrmReadQuery,
    ServiceAreaTypeOrmReadQuery,
    CustomerAddressTypeOrmRepository,
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
      provide: SERVICE_AREA_READ_QUERY,
      useExisting: ServiceAreaTypeOrmReadQuery,
    },
    {
      provide: CUSTOMER_ADDRESS_REPOSITORY,
      useExisting: CustomerAddressTypeOrmRepository,
    },
    {
      provide: SERVICE_REQUEST_REPOSITORY,
      useExisting: ServiceRequestTypeOrmRepository,
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
    SERVICE_AREA_READ_QUERY,
    CUSTOMER_ADDRESS_REPOSITORY,
    SERVICE_REQUEST_REPOSITORY,
    PASSWORD_HASHER,
    AUTH_TOKEN_SERVICE,
  ],
})
export class InfraModule {}
