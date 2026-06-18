import { randomUUID } from 'node:crypto';

import { requireNonBlankString } from '@common/utils/require-non-blank-string';
import { trimStringToNull } from '@common/utils/trim-string-to-null';

import {
  CreateCustomerAddressInput,
  CustomerAddressProps,
  UpdateCustomerAddressInput,
} from './customer-address.props';

export class CustomerAddress {
  private constructor(private readonly props: CustomerAddressProps) {}

  static create(input: CreateCustomerAddressInput): CustomerAddress {
    return new CustomerAddress({
      id: randomUUID(),
      customerId: input.customerId,
      serviceAreaId: input.serviceAreaId,
      line1: requireNonBlankString(input.line1, 'line1'),
      line2: trimStringToNull(input.line2),
      city: requireNonBlankString(input.city, 'city'),
      postalCode: trimStringToNull(input.postalCode),
      notes: trimStringToNull(input.notes),
    });
  }

  static rehydrate(props: CustomerAddressProps): CustomerAddress {
    return new CustomerAddress({
      ...props,
      line1: requireNonBlankString(props.line1, 'line1'),
      line2: trimStringToNull(props.line2),
      city: requireNonBlankString(props.city, 'city'),
      postalCode: trimStringToNull(props.postalCode),
      notes: trimStringToNull(props.notes),
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
