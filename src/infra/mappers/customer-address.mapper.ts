import { CustomerAddress, CustomerAddressWithServiceArea } from '@domain/model';
import { CustomerAddressEntity } from '@db/entities/customer-address.entity';

export class CustomerAddressMapper {
  static toDomain(entity: CustomerAddressEntity): CustomerAddress {
    return CustomerAddress.rehydrate({
      id: entity.id,
      customerId: entity.customerId,
      serviceAreaId: entity.serviceAreaId,
      line1: entity.line1,
      line2: entity.line2,
      city: entity.city,
      postalCode: entity.postalCode,
      notes: entity.notes,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(address: CustomerAddress): CustomerAddressEntity {
    const entity = new CustomerAddressEntity();

    entity.id = address.id;
    entity.customerId = address.customerId;
    entity.serviceAreaId = address.serviceAreaId;
    entity.line1 = address.line1;
    entity.line2 = address.line2;
    entity.city = address.city;
    entity.postalCode = address.postalCode;
    entity.notes = address.notes;

    return entity;
  }

  static toDomainWithServiceArea(entity: CustomerAddressEntity): CustomerAddressWithServiceArea {
    if (!entity.serviceArea) {
      throw new Error('Customer address service area relation was not loaded');
    }

    return {
      address: CustomerAddressMapper.toDomain(entity),
      serviceArea: {
        id: entity.serviceArea.id,
        code: entity.serviceArea.code,
        name: entity.serviceArea.name,
        isActive: entity.serviceArea.isActive,
      },
    };
  }
}
