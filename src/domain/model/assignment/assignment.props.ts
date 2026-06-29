import { AssignmentStatus } from '../assignment-status';
import { AssignmentTimeSlot } from '../assignment-time-slot';

export interface AssignmentProps {
  id: string;
  serviceRequestId: string;
  technicianId: string;
  assignedByUserId: string;
  status: AssignmentStatus;
  startsAt: Date;
  endsAt: Date;
  acceptedAt: Date | null;
  onTheWayAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateAssignmentInput {
  serviceRequestId: string;
  technicianId: string;
  assignedByUserId: string;
  slot: AssignmentTimeSlot;
}
