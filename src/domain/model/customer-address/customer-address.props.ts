import type { CustomerAddress } from './customer-address.model';

export interface CustomerAddressProps {
  id: string;
  customerId: string;
  serviceAreaId: string;
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string | null;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateCustomerAddressInput {
  customerId: string;
  serviceAreaId: string;
  line1: string;
  line2?: string | null;
  city: string;
  postalCode?: string | null;
  notes?: string | null;
}

export interface UpdateCustomerAddressInput {
  serviceAreaId?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  postalCode?: string | null;
  notes?: string | null;
}

export interface CustomerAddressServiceAreaSnapshot {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface CustomerAddressWithServiceArea {
  address: CustomerAddress;
  serviceArea: CustomerAddressServiceAreaSnapshot;
}
