import {
  CustomerAddressNotFoundError,
  EmptyCustomerAddressUpdateError,
  ServiceAreaNotFoundError,
} from '@application/errors';
import { CustomerAddress } from '@domain/model';
import { UpdateCustomerAddressUseCase } from '../update-customer-address.use-case';

describe('UpdateCustomerAddressUseCase', () => {
  const existingAddress = () =>
    CustomerAddress.rehydrate({
      id: 'address-id',
      customerId: 'customer-id',
      serviceAreaId: 'service-area-id',
      line1: '12 Rustaveli Avenue',
      line2: null,
      city: 'Tbilisi',
      postalCode: null,
      notes: null,
      createdAt: new Date('2026-06-14T10:00:00.000Z'),
      updatedAt: new Date('2026-06-14T10:00:00.000Z'),
    });

  const createServiceAreaReadQuery = () => ({
    activeServiceAreaExists: jest.fn(),
  });

  const createCustomerAddressRepository = () => ({
    findByIdForCustomer: jest.fn(),
    save: jest.fn(),
  });

  it('updates only a customer-owned address', async () => {
    const serviceAreaReadQuery = createServiceAreaReadQuery();
    const customerAddressRepository = createCustomerAddressRepository();
    customerAddressRepository.findByIdForCustomer.mockResolvedValue({
      address: existingAddress(),
      serviceArea: {
        id: 'service-area-id',
        code: 'US_CA_SF_BAY',
        name: 'San Francisco Bay Area',
        isActive: true,
      },
    });
    customerAddressRepository.save.mockImplementation((address) =>
      Promise.resolve({
        address,
        serviceArea: {
          id: address.serviceAreaId,
          code: 'US_CA_SF_BAY',
          name: 'San Francisco Bay Area',
          isActive: true,
        },
      }),
    );
    const useCase = new UpdateCustomerAddressUseCase(
      serviceAreaReadQuery as never,
      customerAddressRepository as never,
    );

    await expect(
      useCase.execute({
        customerId: 'customer-id',
        addressId: 'address-id',
        line1: '14 Rustaveli Avenue',
      }),
    ).resolves.toEqual({
      address: expect.objectContaining({
        address: expect.objectContaining({
          id: 'address-id',
          line1: '14 Rustaveli Avenue',
        }),
      }),
    });

    expect(customerAddressRepository.findByIdForCustomer.mock.calls).toEqual([
      ['address-id', 'customer-id'],
    ]);
  });

  it('returns not found for unknown or unowned addresses', async () => {
    const serviceAreaReadQuery = createServiceAreaReadQuery();
    const customerAddressRepository = createCustomerAddressRepository();
    customerAddressRepository.findByIdForCustomer.mockResolvedValue(null);
    const useCase = new UpdateCustomerAddressUseCase(
      serviceAreaReadQuery as never,
      customerAddressRepository as never,
    );

    await expect(
      useCase.execute({
        customerId: 'customer-id',
        addressId: 'unowned-address-id',
        line1: 'Updated',
      }),
    ).rejects.toBeInstanceOf(CustomerAddressNotFoundError);
  });

  it('rejects inactive or unknown replacement service areas', async () => {
    const serviceAreaReadQuery = createServiceAreaReadQuery();
    const customerAddressRepository = createCustomerAddressRepository();
    customerAddressRepository.findByIdForCustomer.mockResolvedValue({
      address: existingAddress(),
      serviceArea: {
        id: 'service-area-id',
        code: 'US_CA_SF_BAY',
        name: 'San Francisco Bay Area',
        isActive: true,
      },
    });
    serviceAreaReadQuery.activeServiceAreaExists.mockResolvedValue(false);
    const useCase = new UpdateCustomerAddressUseCase(
      serviceAreaReadQuery as never,
      customerAddressRepository as never,
    );

    await expect(
      useCase.execute({
        customerId: 'customer-id',
        addressId: 'address-id',
        serviceAreaId: 'inactive-service-area-id',
      }),
    ).rejects.toBeInstanceOf(ServiceAreaNotFoundError);

    expect(customerAddressRepository.save.mock.calls).toHaveLength(0);
  });

  it('rejects empty updates', async () => {
    const useCase = new UpdateCustomerAddressUseCase({} as never, {} as never);

    await expect(
      useCase.execute({
        customerId: 'customer-id',
        addressId: 'address-id',
      }),
    ).rejects.toBeInstanceOf(EmptyCustomerAddressUpdateError);
  });
});
