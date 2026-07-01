import { IsDateString, IsEnum, IsOptional } from 'class-validator';

import { TechnicianAssignmentItem } from '@application/read-models';
import { AssignmentStatus, RequestPriority, ServiceRequestStatus } from '@domain/model';

export class ListTechnicianAssignmentsQueryDto {
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export interface TechnicianAssignmentServiceRequestResponseDto {
  id: string;
  status: ServiceRequestStatus;
  priority: RequestPriority;
  description: string;
  preferredStartAt: string;
  preferredEndAt: string;
  assignmentDeadlineAt: string;
  completionDeadlineAt: string;
  category: { id: string; code: string; name: string };
  serviceType: { id: string; code: string; name: string; isOther: boolean };
  address: { id: string; city: string; line1: string };
}

export interface TechnicianAssignmentResponseDto {
  id: string;
  status: AssignmentStatus;
  startsAt: string;
  endsAt: string;
  acceptedAt: string | null;
  onTheWayAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  serviceRequest: TechnicianAssignmentServiceRequestResponseDto;
  createdAt: string;
  updatedAt: string;
}

export interface TechnicianAssignmentListResponseDto {
  data: TechnicianAssignmentResponseDto[];
}

export const toTechnicianAssignmentListResponse = (
  assignments: TechnicianAssignmentItem[],
): TechnicianAssignmentListResponseDto => ({
  data: assignments.map((assignment) => ({
    id: assignment.id,
    status: assignment.status,
    startsAt: assignment.startsAt.toISOString(),
    endsAt: assignment.endsAt.toISOString(),
    acceptedAt: assignment.acceptedAt?.toISOString() ?? null,
    onTheWayAt: assignment.onTheWayAt?.toISOString() ?? null,
    startedAt: assignment.startedAt?.toISOString() ?? null,
    completedAt: assignment.completedAt?.toISOString() ?? null,
    cancelledAt: assignment.cancelledAt?.toISOString() ?? null,
    cancellationReason: assignment.cancellationReason,
    serviceRequest: {
      id: assignment.serviceRequest.id,
      status: assignment.serviceRequest.status,
      priority: assignment.serviceRequest.priority,
      description: assignment.serviceRequest.description,
      preferredStartAt: assignment.serviceRequest.preferredStartAt.toISOString(),
      preferredEndAt: assignment.serviceRequest.preferredEndAt.toISOString(),
      assignmentDeadlineAt: assignment.serviceRequest.assignmentDeadlineAt.toISOString(),
      completionDeadlineAt: assignment.serviceRequest.completionDeadlineAt.toISOString(),
      category: assignment.serviceRequest.category,
      serviceType: assignment.serviceRequest.serviceType,
      address: assignment.serviceRequest.address,
    },
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
  })),
});
