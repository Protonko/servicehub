import { randomUUID } from 'node:crypto';

import { requireNonBlankString } from '@common/utils/require-non-blank-string';
import { requireValidDate } from '@common/utils/require-valid-date';
import { trimStringToNull } from '@common/utils/trim-string-to-null';

import {
  InvalidServiceRequestTransitionError,
  ServiceRequestCannotBeAssignedError,
  ServiceRequestCannotBeCancelledError,
  ServiceRequestCannotBeCompletedError,
  ServiceRequestCannotBeTriagedError,
} from '../../exceptions';
import {
  CancelServiceRequestInput,
  CreateServiceRequestInput,
  ServiceRequestProps,
  TriageServiceRequestInput,
} from './service-request.props';
import {
  ServiceRequestLifecycleAction,
  ServiceRequestStateMachine,
} from './service-request-state-machine';
import { ServiceRequestStatus } from './service-request-status';

const requirePositiveInteger = (value: number, fieldName: string): number => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return value;
};

const requirePreferredTimeWindow = (startAt: Date, endAt: Date): void => {
  if (startAt >= endAt) {
    throw new Error('preferredStartAt must be before preferredEndAt');
  }
};

export class ServiceRequest {
  private constructor(private readonly props: ServiceRequestProps) {}

  static create(input: CreateServiceRequestInput): ServiceRequest {
    const preferredStartAt = requireValidDate(input.preferredStartAt, 'preferredStartAt');
    const preferredEndAt = requireValidDate(input.preferredEndAt, 'preferredEndAt');

    requirePreferredTimeWindow(preferredStartAt, preferredEndAt);

    return ServiceRequest.rehydrate({
      id: randomUUID(),
      customerId: input.customerId,
      categoryId: input.categoryId,
      serviceTypeId: input.serviceTypeId,
      addressId: input.addressId,
      slaPolicyId: input.slaPolicyId,
      status: input.isOtherServiceType
        ? ServiceRequestStatus.NeedsTriage
        : ServiceRequestStatus.Created,
      priority: input.priority,
      description: input.description,
      additionalContactInstructions: input.additionalContactInstructions ?? null,
      preferredStartAt,
      preferredEndAt,
      estimatedDurationMinutes: input.estimatedDurationMinutes,
      assignmentDeadlineAt: input.assignmentDeadlineAt,
      completionDeadlineAt: input.completionDeadlineAt,
      triagedAt: null,
      assignedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      escalatedAt: null,
    });
  }

  static rehydrate(props: ServiceRequestProps): ServiceRequest {
    const preferredStartAt = requireValidDate(props.preferredStartAt, 'preferredStartAt');
    const preferredEndAt = requireValidDate(props.preferredEndAt, 'preferredEndAt');

    requirePreferredTimeWindow(preferredStartAt, preferredEndAt);

    return new ServiceRequest({
      ...props,
      description: requireNonBlankString(props.description, 'description'),
      additionalContactInstructions: trimStringToNull(props.additionalContactInstructions),
      preferredStartAt,
      preferredEndAt,
      estimatedDurationMinutes: requirePositiveInteger(
        props.estimatedDurationMinutes,
        'estimatedDurationMinutes',
      ),
      assignmentDeadlineAt: requireValidDate(props.assignmentDeadlineAt, 'assignmentDeadlineAt'),
      completionDeadlineAt: requireValidDate(props.completionDeadlineAt, 'completionDeadlineAt'),
      cancellationReason: trimStringToNull(props.cancellationReason),
    });
  }

  triage(input: TriageServiceRequestInput): ServiceRequest {
    const status = this.resolveLifecycleAction(
      ServiceRequestLifecycleAction.Triage,
      () => new ServiceRequestCannotBeTriagedError(),
    );

    return this.withProps({
      categoryId: input.categoryId,
      serviceTypeId: input.serviceTypeId,
      slaPolicyId: input.slaPolicyId,
      status,
      priority: input.priority,
      estimatedDurationMinutes: requirePositiveInteger(
        input.estimatedDurationMinutes,
        'estimatedDurationMinutes',
      ),
      assignmentDeadlineAt: requireValidDate(input.assignmentDeadlineAt, 'assignmentDeadlineAt'),
      completionDeadlineAt: requireValidDate(input.completionDeadlineAt, 'completionDeadlineAt'),
      triagedAt: requireValidDate(input.triagedAt ?? new Date(), 'triagedAt'),
    });
  }

  canBeAssigned(): boolean {
    return ServiceRequestStateMachine.canApply(this.status, ServiceRequestLifecycleAction.Assign);
  }

  assign(assignedAt: Date = new Date()): ServiceRequest {
    const status = this.resolveLifecycleAction(
      ServiceRequestLifecycleAction.Assign,
      () => new ServiceRequestCannotBeAssignedError(),
    );

    return this.withProps({
      status,
      assignedAt: requireValidDate(assignedAt, 'assignedAt'),
    });
  }

  acceptByTechnician(): ServiceRequest {
    const status = this.resolveLifecycleAction(
      ServiceRequestLifecycleAction.AcceptByTechnician,
      () => new InvalidServiceRequestTransitionError(),
    );

    return this.withProps({ status });
  }

  markTechnicianOnTheWay(): ServiceRequest {
    const status = this.resolveLifecycleAction(
      ServiceRequestLifecycleAction.MarkTechnicianOnTheWay,
      () => new InvalidServiceRequestTransitionError(),
    );

    return this.withProps({ status });
  }

  startWork(): ServiceRequest {
    const status = this.resolveLifecycleAction(
      ServiceRequestLifecycleAction.StartWork,
      () => new InvalidServiceRequestTransitionError(),
    );

    return this.withProps({ status });
  }

  complete(completedAt: Date = new Date()): ServiceRequest {
    const status = this.resolveLifecycleAction(
      ServiceRequestLifecycleAction.Complete,
      () => new ServiceRequestCannotBeCompletedError(),
    );

    return this.withProps({
      status,
      completedAt: requireValidDate(completedAt, 'completedAt'),
    });
  }

  cancel(input: CancelServiceRequestInput = {}): ServiceRequest {
    const status = this.resolveLifecycleAction(
      ServiceRequestLifecycleAction.Cancel,
      () => new ServiceRequestCannotBeCancelledError(),
    );

    return this.withProps({
      status,
      cancelledAt: requireValidDate(input.cancelledAt ?? new Date(), 'cancelledAt'),
      cancellationReason: trimStringToNull(input.reason),
    });
  }

  isSlaBreachCandidate(): boolean {
    return !ServiceRequestStateMachine.isTerminal(this.status);
  }

  get id(): string {
    return this.props.id;
  }

  get customerId(): string {
    return this.props.customerId;
  }

  get categoryId(): string {
    return this.props.categoryId;
  }

  get serviceTypeId(): string {
    return this.props.serviceTypeId;
  }

  get addressId(): string {
    return this.props.addressId;
  }

  get slaPolicyId(): string {
    return this.props.slaPolicyId;
  }

  get status(): ServiceRequestStatus {
    return this.props.status;
  }

  get priority(): ServiceRequestProps['priority'] {
    return this.props.priority;
  }

  get description(): string {
    return this.props.description;
  }

  get additionalContactInstructions(): string | null {
    return this.props.additionalContactInstructions;
  }

  get preferredStartAt(): Date {
    return this.props.preferredStartAt;
  }

  get preferredEndAt(): Date {
    return this.props.preferredEndAt;
  }

  get estimatedDurationMinutes(): number {
    return this.props.estimatedDurationMinutes;
  }

  get assignmentDeadlineAt(): Date {
    return this.props.assignmentDeadlineAt;
  }

  get completionDeadlineAt(): Date {
    return this.props.completionDeadlineAt;
  }

  get triagedAt(): Date | null {
    return this.props.triagedAt;
  }

  get assignedAt(): Date | null {
    return this.props.assignedAt;
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

  get escalatedAt(): Date | null {
    return this.props.escalatedAt;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  private withProps(props: Partial<ServiceRequestProps>): ServiceRequest {
    return ServiceRequest.rehydrate({
      ...this.props,
      ...props,
    });
  }

  private resolveLifecycleAction(
    action: ServiceRequestLifecycleAction,
    createError: () => Error,
  ): ServiceRequestStatus {
    const status = ServiceRequestStateMachine.transition(this.status, action);

    if (status === null) {
      throw createError();
    }

    return status;
  }
}
