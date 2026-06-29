import { randomUUID } from 'node:crypto';

import { requireNonBlankString } from '@common/utils/require-non-blank-string';
import { trimStringToNull } from '@common/utils/trim-string-to-null';

import { AssignmentStatus } from '../assignment-status';
import { AssignmentTimeSlot } from '../assignment-time-slot';
import { AssignmentProps, CreateAssignmentInput } from './assignment.props';

export class Assignment {
  private constructor(private readonly props: AssignmentProps) {}

  static create(input: CreateAssignmentInput): Assignment {
    return Assignment.rehydrate({
      id: randomUUID(),
      serviceRequestId: input.serviceRequestId,
      technicianId: input.technicianId,
      assignedByUserId: input.assignedByUserId,
      status: AssignmentStatus.Assigned,
      startsAt: input.slot.startsAt,
      endsAt: input.slot.endsAt,
      acceptedAt: null,
      onTheWayAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null,
    });
  }

  static rehydrate(props: AssignmentProps): Assignment {
    const slot = AssignmentTimeSlot.create({ startsAt: props.startsAt, endsAt: props.endsAt });

    return new Assignment({
      ...props,
      id: requireNonBlankString(props.id, 'id'),
      serviceRequestId: requireNonBlankString(props.serviceRequestId, 'serviceRequestId'),
      technicianId: requireNonBlankString(props.technicianId, 'technicianId'),
      assignedByUserId: requireNonBlankString(props.assignedByUserId, 'assignedByUserId'),
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      cancellationReason: trimStringToNull(props.cancellationReason),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get serviceRequestId(): string {
    return this.props.serviceRequestId;
  }

  get technicianId(): string {
    return this.props.technicianId;
  }

  get assignedByUserId(): string {
    return this.props.assignedByUserId;
  }

  get status(): AssignmentStatus {
    return this.props.status;
  }

  get startsAt(): Date {
    return new Date(this.props.startsAt.getTime());
  }

  get endsAt(): Date {
    return new Date(this.props.endsAt.getTime());
  }

  get acceptedAt(): Date | null {
    return this.props.acceptedAt;
  }

  get onTheWayAt(): Date | null {
    return this.props.onTheWayAt;
  }

  get startedAt(): Date | null {
    return this.props.startedAt;
  }

  get completedAt(): Date | null {
    return this.props.completedAt;
  }

  get cancelledAt(): Date | null {
    return this.props.cancelledAt;
  }

  get cancellationReason(): string | null {
    return this.props.cancellationReason;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }
}
