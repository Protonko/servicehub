import { IsDateString, IsUUID } from 'class-validator';

import { AssignedTechnician } from '@domain/repositories';

export class AssignTechnicianRequestDto {
  @IsUUID()
  technicianId!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;
}

export interface AssignmentResponseDto {
  id: string;
  serviceRequestId: string;
  technicianId: string;
  assignedByUserId: string;
  status: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentObjectResponseDto {
  data: AssignmentResponseDto;
}

export const toAssignmentResponse = (
  assigned: AssignedTechnician,
): AssignmentObjectResponseDto => ({
  data: {
    id: assigned.assignment.id,
    serviceRequestId: assigned.assignment.serviceRequestId,
    technicianId: assigned.assignment.technicianId,
    assignedByUserId: assigned.assignment.assignedByUserId,
    status: assigned.assignment.status,
    startsAt: assigned.assignment.startsAt.toISOString(),
    endsAt: assigned.assignment.endsAt.toISOString(),
    createdAt: (assigned.assignment.createdAt ?? new Date(0)).toISOString(),
    updatedAt: (assigned.assignment.updatedAt ?? new Date(0)).toISOString(),
  },
});
