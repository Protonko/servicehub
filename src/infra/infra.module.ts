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
import { SERVICE_REQUEST_READ_QUERY } from '@application/queries/service-request-read.query';
import { DISPATCHER_QUEUE_READ_QUERY } from '@application/queries/dispatcher-queue-read.query';
import { TECHNICIAN_MANAGEMENT_READ_QUERY } from '@application/queries/technician-management-read.query';
import { TECHNICIAN_CALENDAR_READ_QUERY } from '@application/queries/technician-calendar-read.query';
import { TECHNICIAN_ELIGIBILITY_QUERY } from '@application/queries/technician-eligibility.query';
import {
  CUSTOMER_ADDRESS_REPOSITORY,
  SERVICE_CATALOG_ADMIN_REPOSITORY,
  SERVICE_REQUEST_REPOSITORY,
  TECHNICIAN_REPOSITORY,
  TECHNICIAN_AVAILABILITY_REPOSITORY,
  USER_REPOSITORY,
} from '@domain/repositories';
import { HmacJwtTokenService } from './auth/hmac-jwt-token.service';
import { ScryptPasswordHasher } from './auth/scrypt-password-hasher';
import { QueueModule } from './queues/queue.module';
import { ServiceAreaTypeOrmReadQuery } from './queries/service-area/service-area.typeorm-read-query';
import { ServiceCatalogTypeOrmReadQuery } from './queries/service-catalog/service-catalog.typeorm-read-query';
import { ServiceRequestTypeOrmReadQuery } from './queries/service-request/service-request.typeorm-read-query';
import { DispatcherQueueTypeOrmReadQuery } from './queries/dispatcher-queue/dispatcher-queue.typeorm-read-query';
import { CustomerAddressTypeOrmRepository } from './repositories/customer-address.typeorm-repository';
import { ServiceCatalogAdminTypeOrmRepository } from './repositories/service-catalog-admin.typeorm-repository';
import { ServiceRequestTypeOrmRepository } from './repositories/service-request.typeorm-repository';
import { UserTypeOrmRepository } from './repositories/user.typeorm-repository';
import { TechnicianTypeOrmRepository } from './repositories/technician.typeorm-repository';
import { TechnicianManagementTypeOrmReadQuery } from './queries/technician-management/technician-management.typeorm-read-query';
import { TechnicianCalendarTypeOrmReadQuery } from './queries/technician-calendar/technician-calendar.typeorm-read-query';
import { TechnicianAvailabilityTypeOrmRepository } from './repositories/technician-availability.typeorm-repository';
import { CustomerAddressEntity } from '@db/entities/customer-address.entity';
import { ServiceAreaEntity } from '@db/entities/service-area.entity';
import { ServiceCategoryEntity } from '@db/entities/service-category.entity';
import { ServiceTypeRequiredSkillEntity } from '@db/entities/service-type-required-skill.entity';
import { ServiceTypeEntity } from '@db/entities/service-type.entity';
import { SkillEntity } from '@db/entities/skill.entity';
import { SlaPolicyEntity } from '@db/entities/sla-policy.entity';
import { TechnicianEntity } from '@db/entities/technician.entity';
import { TechnicianSkillEntity } from '@db/entities/technician-skill.entity';
import { TechnicianServiceAreaEntity } from '@db/entities/technician-service-area.entity';
import { TechnicianAvailabilityWindowEntity } from '@db/entities/technician-availability-window.entity';
import { AssignmentEntity } from '@db/entities/assignment.entity';
import { TechnicianEligibilityTypeOrmQuery } from './queries/technician-eligibility/technician-eligibility.typeorm-query';

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
      TechnicianEntity,
      TechnicianSkillEntity,
      TechnicianServiceAreaEntity,
      TechnicianAvailabilityWindowEntity,
      AssignmentEntity,
    ]),
  ],
  providers: [
    UserTypeOrmRepository,
    ServiceCatalogAdminTypeOrmRepository,
    ServiceRequestTypeOrmRepository,
    ServiceCatalogTypeOrmReadQuery,
    ServiceAreaTypeOrmReadQuery,
    ServiceRequestTypeOrmReadQuery,
    DispatcherQueueTypeOrmReadQuery,
    CustomerAddressTypeOrmRepository,
    TechnicianTypeOrmRepository,
    TechnicianManagementTypeOrmReadQuery,
    TechnicianAvailabilityTypeOrmRepository,
    TechnicianCalendarTypeOrmReadQuery,
    TechnicianEligibilityTypeOrmQuery,
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
      provide: SERVICE_REQUEST_READ_QUERY,
      useExisting: ServiceRequestTypeOrmReadQuery,
    },
    {
      provide: DISPATCHER_QUEUE_READ_QUERY,
      useExisting: DispatcherQueueTypeOrmReadQuery,
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
      provide: TECHNICIAN_REPOSITORY,
      useExisting: TechnicianTypeOrmRepository,
    },
    {
      provide: TECHNICIAN_MANAGEMENT_READ_QUERY,
      useExisting: TechnicianManagementTypeOrmReadQuery,
    },
    {
      provide: TECHNICIAN_AVAILABILITY_REPOSITORY,
      useExisting: TechnicianAvailabilityTypeOrmRepository,
    },
    {
      provide: TECHNICIAN_CALENDAR_READ_QUERY,
      useExisting: TechnicianCalendarTypeOrmReadQuery,
    },
    {
      provide: TECHNICIAN_ELIGIBILITY_QUERY,
      useExisting: TechnicianEligibilityTypeOrmQuery,
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
    SERVICE_REQUEST_READ_QUERY,
    DISPATCHER_QUEUE_READ_QUERY,
    CUSTOMER_ADDRESS_REPOSITORY,
    SERVICE_REQUEST_REPOSITORY,
    TECHNICIAN_REPOSITORY,
    TECHNICIAN_MANAGEMENT_READ_QUERY,
    TECHNICIAN_AVAILABILITY_REPOSITORY,
    TECHNICIAN_CALENDAR_READ_QUERY,
    TECHNICIAN_ELIGIBILITY_QUERY,
    PASSWORD_HASHER,
    AUTH_TOKEN_SERVICE,
  ],
})
export class InfraModule {}
