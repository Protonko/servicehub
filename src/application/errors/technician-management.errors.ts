export class TechnicianUserNotFoundError extends Error {
  constructor() {
    super('Active technician user was not found');
  }
}

export class TechnicianNotFoundError extends Error {
  constructor() {
    super('Technician was not found');
  }
}

export class TechnicianSkillNotFoundError extends Error {
  constructor() {
    super('Active technician skill was not found');
  }
}

export class TechnicianServiceAreaNotFoundError extends Error {
  constructor() {
    super('Active technician service area was not found');
  }
}

export class EmptyTechnicianUpdateError extends Error {
  constructor() {
    super('At least one mutable technician field must be provided');
  }
}

export class TechnicianCalendarForbiddenError extends Error {
  constructor() {
    super('Technician calendar is not visible to this actor');
  }
}

export class InvalidTechnicianEligibilityWindowError extends Error {
  constructor() {
    super('startsAt must be before endsAt');
  }
}

export class ServiceRequestNotAssignableForEligibilityError extends Error {
  constructor() {
    super('Service request status does not allow technician assignment');
  }
}
