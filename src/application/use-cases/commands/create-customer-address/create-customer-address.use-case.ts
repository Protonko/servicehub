import { Inject, Injectable } from '@nestjs/common';

import { ServiceAreaNotFoundError } from '@application/errors';
import {
  SERVICE_AREA_READ_QUERY,
  ServiceAreaReadQuery,
} from '@application/queries/service-area-read.query';
import { CustomerAddress, CustomerAddressWithServiceArea } from '@domain/model';
import { CUSTOMER_ADDRESS_REPOSITORY, CustomerAddressRepository } from '@domain/repositories';

export interface CreateCustomerAddressInput {
  customerId: string;
  serviceAreaId: string;
  line1: string;
  line2?: string | null;
  city: string;
  postalCode?: string | null;
  notes?: string | null;
}

export interface CreateCustomerAddressResult {
  address: CustomerAddressWithServiceArea;
}

@Injectable()
export class CreateCustomerAddressUseCase {
  constructor(
    @Inject(SERVICE_AREA_READ_QUERY)
    private readonly serviceAreaReadQuery: ServiceAreaReadQuery,
    @Inject(CUSTOMER_ADDRESS_REPOSITORY)
    private readonly customerAddressRepository: CustomerAddressRepository,
  ) {}

  async execute(input: CreateCustomerAddressInput): Promise<CreateCustomerAddressResult> {
    const serviceAreaExists = await this.serviceAreaReadQuery.activeServiceAreaExists(
      input.serviceAreaId,
    );

    if (!serviceAreaExists) {
      throw new ServiceAreaNotFoundError();
    }

    const address = CustomerAddress.create(input);
    const savedAddress = await this.customerAddressRepository.create(address);

    return { address: savedAddress };
  }
}
