export enum ServiceRequestStatus {
  Created = 'created',
  NeedsTriage = 'needs_triage',
  Triaged = 'triaged',
  Assigned = 'assigned',
  AcceptedByTechnician = 'accepted_by_technician',
  TechnicianOnTheWay = 'technician_on_the_way',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Failed = 'failed',
}

export const SERVICE_REQUEST_STATUSES = Object.values(ServiceRequestStatus);
