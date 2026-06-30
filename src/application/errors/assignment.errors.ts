export class AssignmentForbiddenError extends Error {
  constructor() {
    super('Actor is not allowed to assign technicians');
    this.name = new.target.name;
  }
}

export class TechnicianAssignmentReadForbiddenError extends Error {
  constructor() {
    super('Actor is not allowed to read technician assignments');
    this.name = new.target.name;
  }
}
