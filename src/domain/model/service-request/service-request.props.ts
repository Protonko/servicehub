import { RequestPriority } from '../request-priority';
import { ServiceRequestStatus } from './service-request-status';

export interface ServiceRequestProps {
  id: string;
  customerId: string;
  categoryId: string;
  serviceTypeId: string;
  addressId: string;
  slaPolicyId: string;
  status: ServiceRequestStatus;
  priority: RequestPriority;
  description: string;
  additionalContactInstructions: string | null;
  preferredStartAt: Date;
  preferredEndAt: Date;
  estimatedDurationMinutes: number;
  assignmentDeadlineAt: Date;
  completionDeadlineAt: Date;
  triagedAt: Date | null;
  assignedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  escalatedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateServiceRequestInput {
  customerId: string;
  categoryId: string;
  serviceTypeId: string;
  addressId: string;
  slaPolicyId: string;
  priority: RequestPriority;
  description: string;
  additionalContactInstructions?: string | null;
  preferredStartAt: Date;
  preferredEndAt: Date;
  estimatedDurationMinutes: number;
  assignmentDeadlineAt: Date;
  completionDeadlineAt: Date;
  isOtherServiceType: boolean;
}

export interface CancelServiceRequestInput {
  cancelledAt?: Date;
  reason?: string | null;
}
