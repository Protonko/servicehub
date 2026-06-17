import { CustomerAddress } from '@domain/model';
import { ListCustomerAddressesUseCase } from '../list-customer-addresses.use-case';

describe('ListCustomerAddressesUseCase', () => {
  it('lists addresses scoped to the authenticated customer id', async () => {
    const address = CustomerAddress.rehydrate({
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
    const customerAddressRepository = {
      listForCustomer: jest.fn().mockResolvedValue([
        {
          address,
          serviceArea: {
            id: 'service-area-id',
            code: 'US_CA_SF_BAY',
            name: 'San Francisco Bay Area',
            isActive: true,
          },
        },
      ]),
    };
    const useCase = new ListCustomerAddressesUseCase(customerAddressRepository as never);

    await expect(useCase.execute({ customerId: 'customer-id' })).resolves.toEqual({
      addresses: [
        expect.objectContaining({
          address: expect.objectContaining({
            id: 'address-id',
            customerId: 'customer-id',
          }),
          serviceArea: expect.objectContaining({ code: 'US_CA_SF_BAY' }),
        }),
      ],
    });
    expect(customerAddressRepository.listForCustomer.mock.calls).toEqual([['customer-id']]);
  });
});
