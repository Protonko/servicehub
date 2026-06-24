export class InactiveTechnicianUserError extends Error {
  constructor() {
    super('Technician profile requires an active user');
    this.name = new.target.name;
  }
}
