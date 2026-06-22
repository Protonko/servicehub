export class ServiceRequestCategoryNotFoundError extends Error {
  constructor() {
    super('Active service category was not found');
  }
}

export class ServiceRequestServiceTypeNotFoundError extends Error {
  constructor() {
    super('Active service type was not found');
  }
}

export class ServiceRequestServiceTypeCategoryMismatchError extends Error {
  constructor() {
    super('Service type does not belong to the selected category');
  }
}

export class ServiceRequestAddressNotFoundError extends Error {
  constructor() {
    super('Customer address was not found');
  }
}

export class ServiceRequestPreferredWindowInPastError extends Error {
  constructor() {
    super('Preferred time window must be in the future');
  }
}

export class ServiceRequestNotFoundError extends Error {
  constructor() {
    super('Service request was not found');
  }
}

export class ServiceRequestReadForbiddenError extends Error {
  constructor() {
    super('Actor is not allowed to read service requests');
  }
}

export class ServiceRequestTriageForbiddenError extends Error {
  constructor() {
    super('Actor is not allowed to triage service requests');
  }
}

export class ServiceRequestTriageSkillNotFoundError extends Error {
  constructor() {
    super('One or more active required skills were not found');
  }
}

export class ServiceRequestTriageDuplicateSkillsError extends Error {
  constructor() {
    super('Required skill ids must be unique');
  }
}
