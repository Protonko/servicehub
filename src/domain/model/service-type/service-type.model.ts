import { randomUUID } from 'node:crypto';

import {
  CreateServiceTypeInput,
  ServiceTypeProps,
  UpdateServiceTypeInput,
} from './service-type.props';

const normalizeCode = (code: string): string => code.trim().toUpperCase();

const requireNonBlank = (value: string, fieldName: string): string => {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${fieldName} must not be blank`);
  }

  return trimmed;
};

const requirePositiveInteger = (value: number, fieldName: string): number => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return value;
};

const uniqueIds = (ids: string[]): string[] => [...new Set(ids)];

export class ServiceType {
  private constructor(private readonly props: ServiceTypeProps) {}

  static create(input: CreateServiceTypeInput): ServiceType {
    return new ServiceType({
      id: randomUUID(),
      categoryId: input.categoryId,
      slaPolicyId: input.slaPolicyId,
      code: requireNonBlank(normalizeCode(input.code), 'code'),
      name: requireNonBlank(input.name, 'name'),
      description: input.description ?? null,
      defaultPriority: input.defaultPriority,
      estimatedDurationMinutes: requirePositiveInteger(
        input.estimatedDurationMinutes,
        'estimatedDurationMinutes',
      ),
      isOther: input.isOther,
      isActive: input.isActive ?? true,
      requiredSkillIds: uniqueIds(input.requiredSkillIds),
    });
  }

  static rehydrate(props: ServiceTypeProps): ServiceType {
    return new ServiceType({
      ...props,
      code: requireNonBlank(normalizeCode(props.code), 'code'),
      name: requireNonBlank(props.name, 'name'),
      estimatedDurationMinutes: requirePositiveInteger(
        props.estimatedDurationMinutes,
        'estimatedDurationMinutes',
      ),
      requiredSkillIds: uniqueIds(props.requiredSkillIds),
    });
  }

  update(input: UpdateServiceTypeInput): ServiceType {
    return ServiceType.rehydrate({
      ...this.props,
      slaPolicyId: input.slaPolicyId !== undefined ? input.slaPolicyId : this.props.slaPolicyId,
      name: input.name !== undefined ? input.name : this.props.name,
      description: input.description !== undefined ? input.description : this.props.description,
      defaultPriority:
        input.defaultPriority !== undefined ? input.defaultPriority : this.props.defaultPriority,
      estimatedDurationMinutes:
        input.estimatedDurationMinutes !== undefined
          ? input.estimatedDurationMinutes
          : this.props.estimatedDurationMinutes,
      isOther: input.isOther !== undefined ? input.isOther : this.props.isOther,
      isActive: input.isActive !== undefined ? input.isActive : this.props.isActive,
      requiredSkillIds:
        input.requiredSkillIds !== undefined ? input.requiredSkillIds : this.props.requiredSkillIds,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get categoryId(): string {
    return this.props.categoryId;
  }

  get slaPolicyId(): string {
    return this.props.slaPolicyId;
  }

  get code(): string {
    return this.props.code;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | null {
    return this.props.description;
  }

  get defaultPriority(): ServiceTypeProps['defaultPriority'] {
    return this.props.defaultPriority;
  }

  get estimatedDurationMinutes(): number {
    return this.props.estimatedDurationMinutes;
  }

  get isOther(): boolean {
    return this.props.isOther;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get requiredSkillIds(): string[] {
    return [...this.props.requiredSkillIds];
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }
}
