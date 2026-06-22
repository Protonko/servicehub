import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AuditLogEntity } from '@db/entities/audit-log.entity';
import { OutboxEventEntity } from '@db/entities/outbox-event.entity';
import { ServiceRequestAttachmentEntity } from '@db/entities/service-request-attachment.entity';
import { ServiceRequestRequiredSkillEntity } from '@db/entities/service-request-required-skill.entity';
import { ServiceRequestEntity } from '@db/entities/service-request.entity';
import {
  CreatedServiceRequest,
  CreateServiceRequestPersistenceInput,
  ServiceRequestRepository,
  TriagedServiceRequest,
  TriageServiceRequestPersistenceInput,
} from '@domain/repositories';
import { ServiceRequest } from '@domain/model';
import { ServiceRequestTriageConflictError } from '@domain/exceptions';
import { ServiceRequestMapper } from '../mappers/service-request.mapper';

const SERVICE_REQUEST_CREATED = 'ServiceRequestCreated';
const SERVICE_REQUEST_AGGREGATE = 'service_request';
const REQUEST_ATTACHMENT_KIND = 'request_photo';
const SERVICE_REQUEST_TRIAGED = 'ServiceRequestTriaged';

@Injectable()
export class ServiceRequestTypeOrmRepository implements ServiceRequestRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async create(input: CreateServiceRequestPersistenceInput): Promise<CreatedServiceRequest> {
    return this.dataSource.transaction(async (manager) => {
      const savedRequest = await manager.save(
        ServiceRequestEntity,
        ServiceRequestMapper.toEntity(input.request),
      );

      if (input.requiredSkillIds.length > 0) {
        await manager.insert(
          ServiceRequestRequiredSkillEntity,
          input.requiredSkillIds.map((skillId) => ({
            serviceRequestId: savedRequest.id,
            skillId,
          })),
        );
      }

      const attachments =
        input.attachments.length > 0
          ? await manager.save(
              ServiceRequestAttachmentEntity,
              input.attachments.map((attachment) => ({
                serviceRequestId: savedRequest.id,
                uploadedByUserId: input.actorUserId,
                fileName: attachment.fileName,
                mimeType: attachment.mimeType,
                storageKey: attachment.storageKey,
                kind: REQUEST_ATTACHMENT_KIND,
              })),
            )
          : [];

      const newValue = this.createAuditValue(savedRequest, input.requiredSkillIds);

      await manager.save(AuditLogEntity, {
        actorUserId: input.actorUserId,
        action: SERVICE_REQUEST_CREATED,
        entityType: SERVICE_REQUEST_AGGREGATE,
        entityId: savedRequest.id,
        oldValue: null,
        newValue,
        requestId: null,
        correlationId: null,
      });

      await manager.insert(OutboxEventEntity, {
        eventType: SERVICE_REQUEST_CREATED,
        aggregateType: SERVICE_REQUEST_AGGREGATE,
        aggregateId: savedRequest.id,
        payload: {
          requestId: savedRequest.id,
          customerId: savedRequest.customerId,
          categoryId: savedRequest.categoryId,
          serviceTypeId: savedRequest.serviceTypeId,
          status: savedRequest.status,
          priority: savedRequest.priority,
          assignmentDeadlineAt: savedRequest.assignmentDeadlineAt.toISOString(),
          completionDeadlineAt: savedRequest.completionDeadlineAt.toISOString(),
        },
        status: 'pending',
        attempts: 0,
      });

      return {
        request: ServiceRequestMapper.toDomain(savedRequest),
        requiredSkillIds: [...input.requiredSkillIds],
        attachments: attachments.map((attachment) =>
          ServiceRequestMapper.toAttachmentSnapshot(attachment),
        ),
      };
    });
  }

  async findById(requestId: string): Promise<ServiceRequest | null> {
    const request = await this.dataSource.getRepository(ServiceRequestEntity).findOneBy({
      id: requestId,
    });

    return request ? ServiceRequestMapper.toDomain(request) : null;
  }

  async triage(input: TriageServiceRequestPersistenceInput): Promise<TriagedServiceRequest> {
    return this.dataSource.transaction(async (manager) => {
      const current = await manager.findOne(ServiceRequestEntity, {
        where: { id: input.request.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!current || current.status !== String(input.expectedStatus)) {
        throw new ServiceRequestTriageConflictError();
      }

      const oldRequiredSkills = await manager.find(ServiceRequestRequiredSkillEntity, {
        where: { serviceRequestId: current.id },
      });
      const oldValue = this.createTriageAuditValue(
        current,
        oldRequiredSkills.map((requiredSkill) => requiredSkill.skillId),
      );
      const replacement = ServiceRequestMapper.toEntity(input.request);

      Object.assign(current, {
        categoryId: replacement.categoryId,
        serviceTypeId: replacement.serviceTypeId,
        slaPolicyId: replacement.slaPolicyId,
        status: replacement.status,
        priority: replacement.priority,
        estimatedDurationMinutes: replacement.estimatedDurationMinutes,
        assignmentDeadlineAt: replacement.assignmentDeadlineAt,
        completionDeadlineAt: replacement.completionDeadlineAt,
        triagedAt: replacement.triagedAt,
      });

      const savedRequest = await manager.save(ServiceRequestEntity, current);

      await manager.delete(ServiceRequestRequiredSkillEntity, {
        serviceRequestId: savedRequest.id,
      });

      if (input.requiredSkillIds.length > 0) {
        await manager.insert(
          ServiceRequestRequiredSkillEntity,
          input.requiredSkillIds.map((skillId) => ({
            serviceRequestId: savedRequest.id,
            skillId,
          })),
        );
      }

      const newValue = this.createTriageAuditValue(savedRequest, input.requiredSkillIds);

      await manager.save(AuditLogEntity, {
        actorUserId: input.actorUserId,
        action: SERVICE_REQUEST_TRIAGED,
        entityType: SERVICE_REQUEST_AGGREGATE,
        entityId: savedRequest.id,
        oldValue,
        newValue,
        requestId: null,
        correlationId: null,
      });
      await manager.insert(OutboxEventEntity, {
        eventType: SERVICE_REQUEST_TRIAGED,
        aggregateType: SERVICE_REQUEST_AGGREGATE,
        aggregateId: savedRequest.id,
        payload: {
          requestId: savedRequest.id,
          categoryId: savedRequest.categoryId,
          serviceTypeId: savedRequest.serviceTypeId,
          status: savedRequest.status,
          priority: savedRequest.priority,
          estimatedDurationMinutes: savedRequest.estimatedDurationMinutes,
          requiredSkillIds: input.requiredSkillIds,
          slaPolicyId: savedRequest.slaPolicyId,
          assignmentDeadlineAt: savedRequest.assignmentDeadlineAt.toISOString(),
          completionDeadlineAt: savedRequest.completionDeadlineAt.toISOString(),
        },
        status: 'pending',
        attempts: 0,
      });

      return {
        request: ServiceRequestMapper.toDomain(savedRequest),
        requiredSkillIds: [...input.requiredSkillIds],
      };
    });
  }

  private createAuditValue(
    request: ServiceRequestEntity,
    requiredSkillIds: string[],
  ): Record<string, unknown> {
    return {
      id: request.id,
      customerId: request.customerId,
      categoryId: request.categoryId,
      serviceTypeId: request.serviceTypeId,
      addressId: request.addressId,
      slaPolicyId: request.slaPolicyId,
      status: request.status,
      priority: request.priority,
      preferredStartAt: request.preferredStartAt.toISOString(),
      preferredEndAt: request.preferredEndAt.toISOString(),
      assignmentDeadlineAt: request.assignmentDeadlineAt.toISOString(),
      completionDeadlineAt: request.completionDeadlineAt.toISOString(),
      requiredSkillIds,
    };
  }

  private createTriageAuditValue(
    request: ServiceRequestEntity,
    requiredSkillIds: string[],
  ): Record<string, unknown> {
    return {
      categoryId: request.categoryId,
      serviceTypeId: request.serviceTypeId,
      slaPolicyId: request.slaPolicyId,
      status: request.status,
      priority: request.priority,
      estimatedDurationMinutes: request.estimatedDurationMinutes,
      assignmentDeadlineAt: request.assignmentDeadlineAt.toISOString(),
      completionDeadlineAt: request.completionDeadlineAt.toISOString(),
      triagedAt: request.triagedAt?.toISOString() ?? null,
      requiredSkillIds,
    };
  }
}
