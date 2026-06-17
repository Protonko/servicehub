import { ServiceAreaNotFoundError } from '@application/errors';
import { CreateCustomerAddressUseCase } from '../create-customer-address.use-case';

describe('CreateCustomerAddressUseCase', () => {
  const createServiceAreaReadQuery = () => ({
    activeServiceAreaExists: jest.fn(),
  });

  const createCustomerAddressRepository = () => ({
    create: jest.fn(),
  });

  it('creates an address for the authenticated customer when the service area is active', async () => {
    const serviceAreaReadQuery = createServiceAreaReadQuery();
    const customerAddressRepository = createCustomerAddressRepository();
    serviceAreaReadQuery.activeServiceAreaExists.mockResolvedValue(true);
    customerAddressRepository.create.mockImplementation((address) =>
      Promise.resolve({
        address,
        serviceArea: {
          id: 'service-area-id',
          code: 'US_CA_SF_BAY',
          name: 'San Francisco Bay Area',
          isActive: true,
        },
      }),
    );
    const useCase = new CreateCustomerAddressUseCase(
      serviceAreaReadQuery as never,
      customerAddressRepository as never,
    );

    const result = await useCase.execute({
      customerId: 'customer-id',
      serviceAreaId: 'service-area-id',
      line1: '  12 Rustaveli Avenue ',
      city: ' Tbilisi ',
    });

    const addressToCreate = customerAddressRepository.create.mock.calls[0][0];

    expect(addressToCreate.customerId).toBe('customer-id');
    expect(addressToCreate.line1).toBe('12 Rustaveli Avenue');
    expect(result.address.serviceArea.code).toBe('US_CA_SF_BAY');
  });

  it('rejects inactive or unknown service areas before creating an address', async () => {
    const serviceAreaReadQuery = createServiceAreaReadQuery();
    const customerAddressRepository = createCustomerAddressRepository();
    serviceAreaReadQuery.activeServiceAreaExists.mockResolvedValue(false);
    const useCase = new CreateCustomerAddressUseCase(
      serviceAreaReadQuery as never,
      customerAddressRepository as never,
    );

    await expect(
      useCase.execute({
        customerId: 'customer-id',
        serviceAreaId: 'inactive-service-area-id',
        line1: '12 Rustaveli Avenue',
        city: 'Tbilisi',
      }),
    ).rejects.toBeInstanceOf(ServiceAreaNotFoundError);

    expect(customerAddressRepository.create.mock.calls).toHaveLength(0);
  });
});
