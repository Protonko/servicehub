import { Inject, Injectable } from '@nestjs/common';

import { CustomerAddressWithServiceArea } from '@domain/model';
import { CUSTOMER_ADDRESS_REPOSITORY, CustomerAddressRepository } from '@domain/repositories';

export interface ListCustomerAddressesInput {
  customerId: string;
}

export interface ListCustomerAddressesResult {
  addresses: CustomerAddressWithServiceArea[];
}

@Injectable()
export class ListCustomerAddressesUseCase {
  constructor(
    @Inject(CUSTOMER_ADDRESS_REPOSITORY)
    private readonly customerAddressRepository: CustomerAddressRepository,
  ) {}

  async execute(input: ListCustomerAddressesInput): Promise<ListCustomerAddressesResult> {
    const addresses = await this.customerAddressRepository.listForCustomer(input.customerId);

    return { addresses };
  }
}
