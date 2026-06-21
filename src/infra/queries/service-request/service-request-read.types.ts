import { RequestPriority, ServiceRequestStatus } from '@domain/model';

export interface ServiceRequestSummaryRow {
  requestId: string;
  customerId: string;
  customerFullName: string;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  serviceTypeId: string;
  serviceTypeCode: string;
  serviceTypeName: string;
  serviceTypeIsOther: boolean;
  addressId: string;
  addressCity: string;
  addressLine1: string;
  status: ServiceRequestStatus;
  priority: RequestPriority;
  preferredStartAt: Date;
  preferredEndAt: Date;
  assignmentDeadlineAt: Date;
  completionDeadlineAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceRequestDetailRow extends ServiceRequestSummaryRow {
  customerEmail: string;
  customerPhone: string | null;
  serviceAreaId: string;
  serviceAreaCode: string;
  serviceAreaName: string;
  addressLine2: string | null;
  addressPostalCode: string | null;
  addressNotes: string | null;
  slaPolicyId: string;
  slaPolicyCode: string;
  slaPolicyName: string;
  description: string;
  additionalContactInstructions: string | null;
  estimatedDurationMinutes: number;
  triagedAt: Date | null;
  assignedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  escalatedAt: Date | null;
  skillId: string | null;
  skillCode: string | null;
  skillName: string | null;
  attachmentId: string | null;
  attachmentUploadedByUserId: string | null;
  attachmentFileName: string | null;
  attachmentMimeType: string | null;
  attachmentStorageKey: string | null;
  attachmentKind: string | null;
  attachmentCreatedAt: Date | null;
}
