import { randomUUID } from 'node:crypto';

import {
  CreateServiceCategoryInput,
  ServiceCategoryProps,
  UpdateServiceCategoryInput,
} from './service-category.props';

const normalizeCode = (code: string): string => code.trim().toUpperCase();

const requireNonBlank = (value: string, fieldName: string): string => {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${fieldName} must not be blank`);
  }

  return trimmed;
};

export class ServiceCategory {
  private constructor(private readonly props: ServiceCategoryProps) {}

  static create(input: CreateServiceCategoryInput): ServiceCategory {
    return new ServiceCategory({
      id: randomUUID(),
      code: requireNonBlank(normalizeCode(input.code), 'code'),
      name: requireNonBlank(input.name, 'name'),
      description: input.description ?? null,
      isActive: input.isActive ?? true,
    });
  }

  static rehydrate(props: ServiceCategoryProps): ServiceCategory {
    return new ServiceCategory({
      ...props,
      code: requireNonBlank(normalizeCode(props.code), 'code'),
      name: requireNonBlank(props.name, 'name'),
    });
  }

  update(input: UpdateServiceCategoryInput): ServiceCategory {
    return ServiceCategory.rehydrate({
      ...this.props,
      name: input.name !== undefined ? input.name : this.props.name,
      description: input.description !== undefined ? input.description : this.props.description,
      isActive: input.isActive !== undefined ? input.isActive : this.props.isActive,
    });
  }

  get id(): string {
    return this.props.id;
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

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }
}
