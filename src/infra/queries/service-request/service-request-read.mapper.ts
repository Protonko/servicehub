import {
  ServiceRequestAttachmentSummary,
  ServiceRequestDetail,
  ServiceRequestSkillSummary,
  ServiceRequestSummary,
} from '@application/read-models';

import { ServiceRequestDetailRow, ServiceRequestSummaryRow } from './service-request-read.types';

export class ServiceRequestReadMapper {
  static toSummary(row: ServiceRequestSummaryRow): ServiceRequestSummary {
    return {
      id: row.requestId,
      customer: { id: row.customerId, fullName: row.customerFullName },
      category: { id: row.categoryId, code: row.categoryCode, name: row.categoryName },
      serviceType: {
        id: row.serviceTypeId,
        code: row.serviceTypeCode,
        name: row.serviceTypeName,
        isOther: row.serviceTypeIsOther,
      },
      address: { id: row.addressId, city: row.addressCity, line1: row.addressLine1 },
      status: row.status,
      priority: row.priority,
      preferredStartAt: row.preferredStartAt,
      preferredEndAt: row.preferredEndAt,
      assignmentDeadlineAt: row.assignmentDeadlineAt,
      completionDeadlineAt: row.completionDeadlineAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static toDetail(rows: ServiceRequestDetailRow[]): ServiceRequestDetail {
    const first = rows[0];
    const skills = new Map<string, ServiceRequestSkillSummary>();
    const attachments = new Map<string, ServiceRequestAttachmentSummary>();

    for (const row of rows) {
      if (row.skillId && row.skillCode && row.skillName) {
        skills.set(row.skillId, {
          id: row.skillId,
          code: row.skillCode,
          name: row.skillName,
        });
      }

      if (
        row.attachmentId &&
        row.attachmentUploadedByUserId &&
        row.attachmentFileName &&
        row.attachmentMimeType &&
        row.attachmentStorageKey &&
        row.attachmentKind &&
        row.attachmentCreatedAt
      ) {
        attachments.set(row.attachmentId, {
          id: row.attachmentId,
          uploadedByUserId: row.attachmentUploadedByUserId,
          fileName: row.attachmentFileName,
          mimeType: row.attachmentMimeType,
          storageKey: row.attachmentStorageKey,
          kind: row.attachmentKind,
          createdAt: row.attachmentCreatedAt,
        });
      }
    }

    return {
      id: first.requestId,
      customer: {
        id: first.customerId,
        fullName: first.customerFullName,
        email: first.customerEmail,
        phone: first.customerPhone,
      },
      category: {
        id: first.categoryId,
        code: first.categoryCode,
        name: first.categoryName,
      },
      serviceType: {
        id: first.serviceTypeId,
        code: first.serviceTypeCode,
        name: first.serviceTypeName,
        isOther: first.serviceTypeIsOther,
      },
      address: {
        id: first.addressId,
        serviceArea: {
          id: first.serviceAreaId,
          code: first.serviceAreaCode,
          name: first.serviceAreaName,
        },
        line1: first.addressLine1,
        line2: first.addressLine2,
        city: first.addressCity,
        postalCode: first.addressPostalCode,
        notes: first.addressNotes,
      },
      slaPolicy: {
        id: first.slaPolicyId,
        code: first.slaPolicyCode,
        name: first.slaPolicyName,
      },
      status: first.status,
      priority: first.priority,
      description: first.description,
      additionalContactInstructions: first.additionalContactInstructions,
      preferredStartAt: first.preferredStartAt,
      preferredEndAt: first.preferredEndAt,
      estimatedDurationMinutes: Number(first.estimatedDurationMinutes),
      assignmentDeadlineAt: first.assignmentDeadlineAt,
      completionDeadlineAt: first.completionDeadlineAt,
      triagedAt: first.triagedAt,
      assignedAt: first.assignedAt,
      completedAt: first.completedAt,
      cancelledAt: first.cancelledAt,
      cancellationReason: first.cancellationReason,
      escalatedAt: first.escalatedAt,
      requiredSkills: [...skills.values()].sort((left, right) =>
        this.compareSkillSummaries(left, right),
      ),
      attachments: [...attachments.values()].sort((left, right) =>
        this.compareAttachmentSummaries(left, right),
      ),
      createdAt: first.createdAt,
      updatedAt: first.updatedAt,
    };
  }

  private static compareSkillSummaries(
    left: ServiceRequestSkillSummary,
    right: ServiceRequestSkillSummary,
  ): number {
    return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
  }

  private static compareAttachmentSummaries(
    left: ServiceRequestAttachmentSummary,
    right: ServiceRequestAttachmentSummary,
  ): number {
    return (
      left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id)
    );
  }
}
