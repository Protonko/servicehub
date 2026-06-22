export class DispatcherQueueForbiddenError extends Error {
  constructor() {
    super('Actor is not allowed to read the dispatcher queue');
  }
}
