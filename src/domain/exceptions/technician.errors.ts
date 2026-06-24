export class InactiveTechnicianUserError extends Error {
  constructor() {
    super('Technician profile requires an active user');
    this.name = new.target.name;
  }
}

export class DuplicateTechnicianProfileError extends Error {
  constructor() {
    super('User already has a technician profile');
    this.name = new.target.name;
  }
}
