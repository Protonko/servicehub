import { randomUUID } from 'node:crypto';

import {
  CreateCustomerAddressInput,
  CustomerAddressProps,
  UpdateCustomerAddressInput,
} from './customer-address.props';

const requireNonBlank = (value: string, fieldName: string): string => {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${fieldName} must not be blank`);
  }

  return trimmed;
};

const normalizeNullableString = (value: string | null | undefined): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed : null;
};

export class CustomerAddress {
  private constructor(private readonly props: CustomerAddressProps) {}

  static create(input: CreateCustomerAddressInput): CustomerAddress {
    return new CustomerAddress({
      id: randomUUID(),
      customerId: input.customerId,
      serviceAreaId: input.serviceAreaId,
      line1: requireNonBlank(input.line1, 'line1'),
      line2: normalizeNullableString(input.line2),
      city: requireNonBlank(input.city, 'city'),
      postalCode: normalizeNullableString(input.postalCode),
      notes: normalizeNullableString(input.notes),
    });
  }

  static rehydrate(props: CustomerAddressProps): CustomerAddress {
    return new CustomerAddress({
      ...props,
      line1: requireNonBlank(props.line1, 'line1'),
      line2: normalizeNullableString(props.line2),
      city: requireNonBlank(props.city, 'city'),
      postalCode: normalizeNullableString(props.postalCode),
      notes: normalizeNullableString(props.notes),
    });
  }

  update(input: UpdateCustomerAddressInput): CustomerAddress {
    return CustomerAddress.rehydrate({
      ...this.props,
      serviceAreaId:
        input.serviceAreaId !== undefined ? input.serviceAreaId : this.props.serviceAreaId,
      line1: input.line1 !== undefined ? input.line1 : this.props.line1,
      line2: input.line2 !== undefined ? input.line2 : this.props.line2,
      city: input.city !== undefined ? input.city : this.props.city,
      postalCode: input.postalCode !== undefined ? input.postalCode : this.props.postalCode,
      notes: input.notes !== undefined ? input.notes : this.props.notes,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get customerId(): string {
    return this.props.customerId;
  }

  get serviceAreaId(): string {
    return this.props.serviceAreaId;
  }

  get line1(): string {
    return this.props.line1;
  }

  get line2(): string | null {
    return this.props.line2;
  }

  get city(): string {
    return this.props.city;
  }

  get postalCode(): string | null {
    return this.props.postalCode;
  }

  get notes(): string | null {
    return this.props.notes;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }
}
