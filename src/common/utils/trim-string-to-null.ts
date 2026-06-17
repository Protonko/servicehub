import { trimString } from './trim-string';

export const trimStringToNull = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return value;
  }

  const trimmed = trimString(value);

  return trimmed === '' ? null : trimmed;
};
