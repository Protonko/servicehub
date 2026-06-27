export class AssignmentDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidAssignmentTimeSlotError extends AssignmentDomainError {}

export class TechnicianNotActiveForAssignmentError extends AssignmentDomainError {
  constructor() {
    super('Technician must be active to receive an assignment');
  }
}

export class TechnicianMissingRequiredSkillsError extends AssignmentDomainError {
  readonly missingSkillIds: readonly string[];

  constructor(missingSkillIds: readonly string[]) {
    super('Technician does not have every skill required by the service request');
    this.missingSkillIds = [...missingSkillIds];
  }
}

export class TechnicianOutsideServiceAreaError extends AssignmentDomainError {
  constructor(readonly serviceAreaId: string) {
    super('Technician does not serve the service request area');
  }
}

export class TechnicianUnavailableForAssignmentError extends AssignmentDomainError {
  constructor() {
    super('Technician is not available for the selected time slot');
  }
}

export class TechnicianScheduleOverlapError extends AssignmentDomainError {
  constructor() {
    super('Technician has an active assignment overlapping the selected time slot');
  }
}
