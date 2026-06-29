import { InvalidAssignmentTimeSlotError } from '@domain/exceptions';

import { AssignmentTimeSlotProps } from './assignment-time-slot.props';

const requireSlotDate = (value: Date, fieldName: string): Date => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new InvalidAssignmentTimeSlotError(`${fieldName} must be a valid date`);
  }

  return value;
};

export class AssignmentTimeSlot {
  private constructor(private readonly props: AssignmentTimeSlotProps) {}

  static create(props: AssignmentTimeSlotProps): AssignmentTimeSlot {
    const startsAt = requireSlotDate(props.startsAt, 'startsAt');
    const endsAt = requireSlotDate(props.endsAt, 'endsAt');

    if (startsAt.getTime() >= endsAt.getTime()) {
      throw new InvalidAssignmentTimeSlotError('startsAt must be before endsAt');
    }

    return new AssignmentTimeSlot({
      startsAt: new Date(startsAt.getTime()),
      endsAt: new Date(endsAt.getTime()),
    });
  }

  contains(other: AssignmentTimeSlot): boolean {
    return (
      this.startsAt.getTime() <= other.startsAt.getTime() &&
      this.endsAt.getTime() >= other.endsAt.getTime()
    );
  }

  overlaps(other: AssignmentTimeSlot): boolean {
    return (
      this.startsAt.getTime() < other.endsAt.getTime() &&
      this.endsAt.getTime() > other.startsAt.getTime()
    );
  }

  get startsAt(): Date {
    return new Date(this.props.startsAt.getTime());
  }

  get endsAt(): Date {
    return new Date(this.props.endsAt.getTime());
  }
}
