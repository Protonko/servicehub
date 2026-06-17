export class ServiceAreaNotFoundError extends Error {
  constructor() {
    super('Active service area was not found');
  }
}

export class CustomerAddressNotFoundError extends Error {
  constructor() {
    super('Customer address was not found');
  }
}

export class EmptyCustomerAddressUpdateError extends Error {
  constructor() {
    super('At least one customer address field must be provided');
  }
}
