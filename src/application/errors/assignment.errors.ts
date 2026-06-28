export class AssignmentForbiddenError extends Error {
  constructor() {
    super('Actor is not allowed to assign technicians');
    this.name = new.target.name;
  }
}
