export const requireNonBlankString = (value: string, fieldName: string): string => {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${fieldName} must not be blank`);
  }

  return trimmed;
};
