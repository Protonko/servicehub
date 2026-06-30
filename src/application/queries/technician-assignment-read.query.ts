import { TechnicianAssignmentItem } from '@application/read-models';
import { AssignmentStatus } from '@domain/model';

export const TECHNICIAN_ASSIGNMENT_READ_QUERY = Symbol('TECHNICIAN_ASSIGNMENT_READ_QUERY');

export interface TechnicianAssignmentCriteria {
  status?: AssignmentStatus;
  from?: Date;
  to?: Date;
}

export interface TechnicianAssignmentReadQuery {
  listForTechnician(
    technicianId: string,
    criteria: TechnicianAssignmentCriteria,
  ): Promise<TechnicianAssignmentItem[]>;
}
