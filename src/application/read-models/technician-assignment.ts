import { RequestPriority, ServiceRequestStatus, AssignmentStatus } from '@domain/model';

export interface TechnicianAssignmentServiceRequestSummary {
  id: string;
  status: ServiceRequestStatus;
  priority: RequestPriority;
  description: string;
  preferredStartAt: Date;
  preferredEndAt: Date;
  assignmentDeadlineAt: Date;
  completionDeadlineAt: Date;
  category: {
    id: string;
    code: string;
    name: string;
  };
  serviceType: {
    id: string;
    code: string;
    name: string;
    isOther: boolean;
  };
  address: {
    id: string;
    city: string;
    line1: string;
  };
}

export interface TechnicianAssignmentItem {
  id: string;
  status: AssignmentStatus;
  startsAt: Date;
  endsAt: Date;
  acceptedAt: Date | null;
  onTheWayAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  serviceRequest: TechnicianAssignmentServiceRequestSummary;
  createdAt: Date;
  updatedAt: Date;
}
