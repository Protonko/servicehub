import {
  Assignment,
  ServiceRequest,
  Technician,
  TechnicianAvailabilityWindow,
} from '@domain/model';
import { ScheduleOverlapChecker } from '@domain/services';

export const ASSIGNMENT_REPOSITORY = Symbol('ASSIGNMENT_REPOSITORY');

export interface AssignmentRequestSnapshot {
  request: ServiceRequest;
  requiredSkillIds: string[];
  serviceAreaId: string;
}

export interface AssignmentTechnicianSnapshot {
  technician: Technician;
  availabilityWindows: TechnicianAvailabilityWindow[];
}

export interface SaveAssignmentOutcomeInput {
  request: ServiceRequest;
  assignment: Assignment;
  actorUserId: string;
}

export interface AssignedTechnician {
  request: ServiceRequest;
  assignment: Assignment;
}

export interface AssignmentTransactionContext extends ScheduleOverlapChecker {
  requestSnapshot: AssignmentRequestSnapshot | null;
  technicianSnapshot: AssignmentTechnicianSnapshot | null;
  saveAssignmentOutcome(input: SaveAssignmentOutcomeInput): Promise<AssignedTechnician>;
}

export interface AssignmentTransactionLookup {
  requestId: string;
  technicianId: string;
}

export interface AssignmentRepository {
  executeTransaction<T>(
    lookup: AssignmentTransactionLookup,
    work: (context: AssignmentTransactionContext) => Promise<T>,
  ): Promise<T>;
}
