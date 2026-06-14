export class DuplicateServiceCategoryCodeError extends Error {
  constructor() {
    super('Service category code already exists');
  }
}

export class DuplicateServiceTypeCodeError extends Error {
  constructor() {
    super('Service type code already exists inside this category');
  }
}

export class EmptyServiceCatalogUpdateError extends Error {
  constructor() {
    super('At least one mutable field must be provided');
  }
}

export class ServiceTypeNotFoundError extends Error {
  constructor() {
    super('Service type was not found');
  }
}

export class SlaPolicyNotFoundError extends Error {
  constructor() {
    super('Active SLA policy was not found');
  }
}

export class SkillNotFoundError extends Error {
  constructor() {
    super('Active skill was not found');
  }
}

export class ServiceTypeOtherAlreadyExistsError extends Error {
  constructor() {
    super('Other service type already exists inside this category');
  }
}
