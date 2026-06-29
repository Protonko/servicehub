import { AssignmentTimeSlot } from '@domain/model';

export interface ScheduleOverlapChecker {
  hasActiveOverlap(technicianId: string, slot: AssignmentTimeSlot): Promise<boolean>;
}
