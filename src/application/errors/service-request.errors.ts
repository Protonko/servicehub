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
