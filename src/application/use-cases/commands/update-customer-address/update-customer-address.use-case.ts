import { Inject, Injectable } from '@nestjs/common';

import {
  CustomerAddressNotFoundError,
  EmptyCustomerAddressUpdateError,
  ServiceAreaNotFoundError,
} from '@application/errors';
import {
  SERVICE_AREA_READ_QUERY,
  ServiceAreaReadQuery,
} from '@application/queries/service-area-read.query';
import { CustomerAddressWithServiceArea } from '@domain/model';
import { CUSTOMER_ADDRESS_REPOSITORY, CustomerAddressRepository } from '@domain/repositories';

export interface UpdateCustomerAddressInput {
  customerId: string;
  addressId: string;
  serviceAreaId?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  postalCode?: string | null;
  notes?: string | null;
}

export interface UpdateCustomerAddressResult {
  address: CustomerAddressWithServiceArea;
}

const editableFields: Array<keyof Omit<UpdateCustomerAddressInput, 'customerId' | 'addressId'>> = [
  'serviceAreaId',
  'line1',
  'line2',
  'city',
  'postalCode',
  'notes',
];

@Injectable()
export class UpdateCustomerAddressUseCase {
  constructor(
    @Inject(SERVICE_AREA_READ_QUERY)
    private readonly serviceAreaReadQuery: ServiceAreaReadQuery,
    @Inject(CUSTOMER_ADDRESS_REPOSITORY)
    private readonly customerAddressRepository: CustomerAddressRepository,
  ) {}

  async execute(input: UpdateCustomerAddressInput): Promise<UpdateCustomerAddressResult> {
    if (!editableFields.some((field) => input[field] !== undefined)) {
      throw new EmptyCustomerAddressUpdateError();
    }

    const addressWithServiceArea = await this.customerAddressRepository.findByIdForCustomer(
      input.addressId,
      input.customerId,
    );

    if (!addressWithServiceArea) {
      throw new CustomerAddressNotFoundError();
    }

    if (
      input.serviceAreaId !== undefined &&
      input.serviceAreaId !== addressWithServiceArea.address.serviceAreaId
    ) {
      const serviceAreaExists = await this.serviceAreaReadQuery.activeServiceAreaExists(
        input.serviceAreaId,
      );

      if (!serviceAreaExists) {
        throw new ServiceAreaNotFoundError();
      }
    }

    const updatedAddress = addressWithServiceArea.address.update(input);
    const savedAddress = await this.customerAddressRepository.save(updatedAddress);

    return { address: savedAddress };
  }
}
