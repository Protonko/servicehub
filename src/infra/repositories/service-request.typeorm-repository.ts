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
} from '@domain/repositories';
import { ServiceRequestMapper } from '../mappers/service-request.mapper';

const SERVICE_REQUEST_CREATED = 'ServiceRequestCreated';
const SERVICE_REQUEST_AGGREGATE = 'service_request';
const REQUEST_ATTACHMENT_KIND = 'request_photo';

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
}
