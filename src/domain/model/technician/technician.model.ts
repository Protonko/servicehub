import { randomUUID } from 'node:crypto';

import { requireNonBlankString } from '@common/utils/require-non-blank-string';

import { CreateTechnicianInput, TechnicianProps, UpdateTechnicianInput } from './technician.props';
import { TechnicianStatus } from './technician-status';

const normalizeIds = (ids: string[], fieldName: string): string[] => [
  ...new Set(ids.map((id) => requireNonBlankString(id, fieldName))),
];

const requireServiceAreas = (serviceAreaIds: string[]): string[] => {
  const normalizedIds = normalizeIds(serviceAreaIds, 'serviceAreaId');

  if (normalizedIds.length === 0) {
    throw new Error('technician must have at least one service area');
  }

  return normalizedIds;
};

const requireDailyAssignmentLimit = (value: number): number => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('dailyAssignmentLimit must be a positive integer');
  }

  return value;
};

const requireRating = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isFinite(value) || value < 0 || value > 5) {
    throw new Error('rating must be between 0 and 5');
  }

  return value;
};

export class Technician {
  private constructor(private readonly props: TechnicianProps) {}

  static create(input: CreateTechnicianInput): Technician {
    return Technician.rehydrate({
      id: randomUUID(),
      userId: input.userId,
      status: input.status ?? TechnicianStatus.Active,
      dailyAssignmentLimit: input.dailyAssignmentLimit,
      rating: input.rating ?? null,
      skillIds: input.skillIds ?? [],
      serviceAreaIds: input.serviceAreaIds,
    });
  }

  static rehydrate(props: TechnicianProps): Technician {
    return new Technician({
      ...props,
      userId: requireNonBlankString(props.userId, 'userId'),
      dailyAssignmentLimit: requireDailyAssignmentLimit(props.dailyAssignmentLimit),
      rating: requireRating(props.rating),
      skillIds: normalizeIds(props.skillIds, 'skillId'),
      serviceAreaIds: requireServiceAreas(props.serviceAreaIds),
    });
  }

  update(input: UpdateTechnicianInput): Technician {
    return Technician.rehydrate({
      ...this.props,
      status: input.status ?? this.props.status,
      dailyAssignmentLimit: input.dailyAssignmentLimit ?? this.props.dailyAssignmentLimit,
      rating: input.rating !== undefined ? input.rating : this.props.rating,
      skillIds: input.skillIds ?? this.props.skillIds,
      serviceAreaIds: input.serviceAreaIds ?? this.props.serviceAreaIds,
    });
  }

  isAssignmentEligible(): boolean {
    return this.props.status === TechnicianStatus.Active;
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get status(): TechnicianStatus {
    return this.props.status;
  }

  get dailyAssignmentLimit(): number {
    return this.props.dailyAssignmentLimit;
  }

  get rating(): number | null {
    return this.props.rating;
  }

  get skillIds(): string[] {
    return [...this.props.skillIds];
  }

  get serviceAreaIds(): string[] {
    return [...this.props.serviceAreaIds];
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }
}
