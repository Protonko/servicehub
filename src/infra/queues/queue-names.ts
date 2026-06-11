export const QUEUE_NAMES = {
  notifications: 'notifications',
  sla: 'sla',
  outbox: 'outbox',
  reports: 'reports',
  imports: 'imports',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
