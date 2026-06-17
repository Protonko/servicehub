import { CustomerAddress, CustomerAddressWithServiceArea } from '@domain/model';

export const CUSTOMER_ADDRESS_REPOSITORY = Symbol('CUSTOMER_ADDRESS_REPOSITORY');

export interface CustomerAddressRepository {
  create(address: CustomerAddress): Promise<CustomerAddressWithServiceArea>;
  findByIdForCustomer(
    addressId: string,
    customerId: string,
  ): Promise<CustomerAddressWithServiceArea | null>;
  listForCustomer(customerId: string): Promise<CustomerAddressWithServiceArea[]>;
  save(address: CustomerAddress): Promise<CustomerAddressWithServiceArea>;
}
