export const trimString = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;
