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
