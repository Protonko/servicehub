import { randomUUID } from 'node:crypto';

import { requireNonBlankString } from '@common/utils/require-non-blank-string';
import { requireValidDate } from '@common/utils/require-valid-date';
import { trimStringToNull } from '@common/utils/trim-string-to-null';
import { InvalidTechnicianAvailabilityWindowError } from '@domain/exceptions';

import {
  CreateTechnicianAvailabilityWindowInput,
  TechnicianAvailabilityWindowProps,
} from './technician-availability-window.props';

const normalizeReason = (reason: string | null | undefined): string | null => {
  const normalized = trimStringToNull(reason);

  if (normalized !== null && normalized.length > 160) {
    throw new InvalidTechnicianAvailabilityWindowError('reason must be at most 160 characters');
  }

  return normalized;
};

const validateRange = (startsAt: Date, endsAt: Date): void => {
  if (startsAt.getTime() >= endsAt.getTime()) {
    throw new InvalidTechnicianAvailabilityWindowError('startsAt must be before endsAt');
  }
};

export class TechnicianAvailabilityWindow {
  private constructor(private readonly props: TechnicianAvailabilityWindowProps) {}

  static create(input: CreateTechnicianAvailabilityWindowInput): TechnicianAvailabilityWindow {
    return TechnicianAvailabilityWindow.rehydrate({
      id: randomUUID(),
      technicianId: input.technicianId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      isAvailable: input.isAvailable,
      reason: input.reason ?? null,
    });
  }

  static rehydrate(props: TechnicianAvailabilityWindowProps): TechnicianAvailabilityWindow {
    const startsAt = requireValidDate(props.startsAt, 'startsAt');
    const endsAt = requireValidDate(props.endsAt, 'endsAt');
    validateRange(startsAt, endsAt);

    if (typeof props.isAvailable !== 'boolean') {
      throw new InvalidTechnicianAvailabilityWindowError('isAvailable must be a boolean');
    }

    return new TechnicianAvailabilityWindow({
      ...props,
      id: requireNonBlankString(props.id, 'id'),
      technicianId: requireNonBlankString(props.technicianId, 'technicianId'),
      startsAt,
      endsAt,
      reason: normalizeReason(props.reason),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get technicianId(): string {
    return this.props.technicianId;
  }

  get startsAt(): Date {
    return this.props.startsAt;
  }

  get endsAt(): Date {
    return this.props.endsAt;
  }

  get isAvailable(): boolean {
    return this.props.isAvailable;
  }

  get reason(): string | null {
    return this.props.reason;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }
}
