import {
  ServiceRequestCannotBeAssignedError,
  TechnicianScheduleOverlapError,
} from '@domain/exceptions';
import { ServiceRequest } from '@domain/model';

export class AssignmentPolicy {
  static assertRequestCanBeAssigned(request: ServiceRequest): void {
    if (!request.canBeAssigned()) {
      throw new ServiceRequestCannotBeAssignedError();
    }
  }

  static assertNoActiveScheduleOverlap(hasActiveOverlap: boolean): void {
    if (hasActiveOverlap) {
      throw new TechnicianScheduleOverlapError();
    }
  }
}
