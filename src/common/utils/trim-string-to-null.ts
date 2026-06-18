export function trimStringToNull(value: string | null | undefined): string | null;
export function trimStringToNull(value: unknown): unknown;
export function trimStringToNull(value: unknown): unknown {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  return trimmed === '' ? null : trimmed;
}
