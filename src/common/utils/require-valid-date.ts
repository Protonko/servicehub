export const requireValidDate = (value: Date, fieldName: string): Date => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }

  return value;
};
