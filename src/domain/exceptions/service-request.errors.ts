export class ServiceRequestDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ServiceRequestCannotBeAssignedError extends ServiceRequestDomainError {
  constructor() {
    super('Service request cannot be assigned in its current status');
  }
}

export class ServiceRequestCannotBeCancelledError extends ServiceRequestDomainError {
  constructor() {
    super('Service request cannot be cancelled in its current status');
  }
}

export class ServiceRequestCannotBeTriagedError extends ServiceRequestDomainError {
  constructor() {
    super('Service request cannot be triaged in its current status');
  }
}

export class ServiceRequestOtherTypeCannotBeTriagedError extends ServiceRequestDomainError {
  constructor() {
    super('Other service type must be replaced during triage');
  }
}

export class ServiceRequestTriageConflictError extends ServiceRequestDomainError {
  constructor() {
    super('Service request changed concurrently and could not be triaged');
  }
}

export class ServiceRequestCannotBeCompletedError extends ServiceRequestDomainError {
  constructor() {
    super('Service request cannot be completed in its current status');
  }
}

export class InvalidServiceRequestTransitionError extends ServiceRequestDomainError {
  constructor() {
    super('Service request status transition is not allowed');
  }
}
