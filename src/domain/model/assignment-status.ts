export enum AssignmentStatus {
  Assigned = 'assigned',
  Accepted = 'accepted',
  OnTheWay = 'on_the_way',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Rejected = 'rejected',
}

export const ACTIVE_ASSIGNMENT_STATUSES = [
  AssignmentStatus.Assigned,
  AssignmentStatus.Accepted,
  AssignmentStatus.OnTheWay,
  AssignmentStatus.InProgress,
] as const;
