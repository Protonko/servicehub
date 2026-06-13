export class ServiceCategoryNotFoundError extends Error {
  constructor() {
    super('Service category was not found');
  }
}
