import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CustomerAddressEntity } from '@db/entities/customer-address.entity';
import { CustomerAddress, CustomerAddressWithServiceArea } from '@domain/model';
import { CustomerAddressRepository } from '@domain/repositories';
import { CustomerAddressMapper } from '../mappers/customer-address.mapper';

@Injectable()
export class CustomerAddressTypeOrmRepository implements CustomerAddressRepository {
  constructor(
    @InjectRepository(CustomerAddressEntity)
    private readonly customerAddressRepository: Repository<CustomerAddressEntity>,
  ) {}

  async create(address: CustomerAddress): Promise<CustomerAddressWithServiceArea> {
    const savedAddress = await this.customerAddressRepository.save(
      CustomerAddressMapper.toEntity(address),
    );

    return this.findCreatedAddress(savedAddress.id, savedAddress.customerId);
  }

  async findByIdForCustomer(
    addressId: string,
    customerId: string,
  ): Promise<CustomerAddressWithServiceArea | null> {
    const address = await this.customerAddressRepository.findOne({
      where: {
        id: addressId,
        customerId,
      },
      relations: {
        serviceArea: true,
      },
    });

    return address ? CustomerAddressMapper.toDomainWithServiceArea(address) : null;
  }

  async listForCustomer(customerId: string): Promise<CustomerAddressWithServiceArea[]> {
    const addresses = await this.customerAddressRepository.find({
      where: {
        customerId,
      },
      relations: {
        serviceArea: true,
      },
      order: {
        updatedAt: 'DESC',
        createdAt: 'DESC',
      },
    });

    return addresses.map((address) => CustomerAddressMapper.toDomainWithServiceArea(address));
  }

  async save(address: CustomerAddress): Promise<CustomerAddressWithServiceArea> {
    const savedAddress = await this.customerAddressRepository.save(
      CustomerAddressMapper.toEntity(address),
    );

    return this.findCreatedAddress(savedAddress.id, savedAddress.customerId);
  }

  private async findCreatedAddress(
    addressId: string,
    customerId: string,
  ): Promise<CustomerAddressWithServiceArea> {
    const address = await this.findByIdForCustomer(addressId, customerId);

    if (!address) {
      throw new Error('Saved customer address could not be reloaded');
    }

    return address;
  }
}
