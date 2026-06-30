import { AssignmentStatus, RequestPriority, ServiceRequestStatus } from '@domain/model';

export interface TechnicianAssignmentRow {
  assignmentId: string;
  assignmentStatus: AssignmentStatus;
  startsAt: Date;
  endsAt: Date;
  acceptedAt: Date | null;
  onTheWayAt: Date | null;
  startedAt: Date | null;
  assignmentCompletedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  assignmentCreatedAt: Date;
  assignmentUpdatedAt: Date;
  requestId: string;
  requestStatus: ServiceRequestStatus;
  requestPriority: RequestPriority;
  requestDescription: string;
  preferredStartAt: Date;
  preferredEndAt: Date;
  assignmentDeadlineAt: Date;
  completionDeadlineAt: Date;
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
}
