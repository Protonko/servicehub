import { ServiceRequestAttachmentEntity } from '@db/entities/service-request-attachment.entity';
import { ServiceRequestEntity } from '@db/entities/service-request.entity';
import { RequestPriority, ServiceRequest, ServiceRequestStatus } from '@domain/model';
import { ServiceRequestAttachmentSnapshot } from '@domain/repositories';

export class ServiceRequestMapper {
  static toEntity(request: ServiceRequest): ServiceRequestEntity {
    const entity = new ServiceRequestEntity();

    entity.id = request.id;
    entity.customerId = request.customerId;
    entity.categoryId = request.categoryId;
    entity.serviceTypeId = request.serviceTypeId;
    entity.addressId = request.addressId;
    entity.slaPolicyId = request.slaPolicyId;
    entity.status = request.status;
    entity.priority = request.priority;
    entity.description = request.description;
    entity.additionalContactInstructions = request.additionalContactInstructions;
    entity.preferredStartAt = request.preferredStartAt;
    entity.preferredEndAt = request.preferredEndAt;
    entity.estimatedDurationMinutes = request.estimatedDurationMinutes;
    entity.assignmentDeadlineAt = request.assignmentDeadlineAt;
    entity.completionDeadlineAt = request.completionDeadlineAt;
    entity.triagedAt = request.triagedAt;
    entity.assignedAt = request.assignedAt;
    entity.completedAt = request.completedAt;
    entity.cancelledAt = request.cancelledAt;
    entity.cancellationReason = request.cancellationReason;
    entity.escalatedAt = request.escalatedAt;

    return entity;
  }

  static toDomain(entity: ServiceRequestEntity): ServiceRequest {
    return ServiceRequest.rehydrate({
      id: entity.id,
      customerId: entity.customerId,
      categoryId: entity.categoryId,
      serviceTypeId: entity.serviceTypeId,
      addressId: entity.addressId,
      slaPolicyId: entity.slaPolicyId,
      status: entity.status as ServiceRequestStatus,
      priority: entity.priority as RequestPriority,
      description: entity.description,
      additionalContactInstructions: entity.additionalContactInstructions,
      preferredStartAt: entity.preferredStartAt,
      preferredEndAt: entity.preferredEndAt,
      estimatedDurationMinutes: entity.estimatedDurationMinutes,
      assignmentDeadlineAt: entity.assignmentDeadlineAt,
      completionDeadlineAt: entity.completionDeadlineAt,
      triagedAt: entity.triagedAt,
      assignedAt: entity.assignedAt,
      completedAt: entity.completedAt,
      cancelledAt: entity.cancelledAt,
      cancellationReason: entity.cancellationReason,
      escalatedAt: entity.escalatedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toAttachmentSnapshot(
    entity: ServiceRequestAttachmentEntity,
  ): ServiceRequestAttachmentSnapshot {
    return {
      id: entity.id,
      serviceRequestId: entity.serviceRequestId,
      uploadedByUserId: entity.uploadedByUserId,
      fileName: entity.fileName,
      mimeType: entity.mimeType,
      storageKey: entity.storageKey,
      kind: entity.kind,
      createdAt: entity.createdAt,
    };
  }
}
