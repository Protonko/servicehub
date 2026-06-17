import { ListServiceAreasUseCase } from '../list-service-areas.use-case';

describe('ListServiceAreasUseCase', () => {
  it('returns active service areas from the read query', async () => {
    const serviceAreaReadQuery = {
      listActiveServiceAreas: jest.fn().mockResolvedValue([
        {
          id: 'service-area-id',
          code: 'US_CA_SF_BAY',
          name: 'San Francisco Bay Area',
          description: 'San Francisco Bay Area operating zone.',
        },
      ]),
    };
    const useCase = new ListServiceAreasUseCase(serviceAreaReadQuery as never);

    await expect(useCase.execute()).resolves.toEqual({
      serviceAreas: [
        {
          id: 'service-area-id',
          code: 'US_CA_SF_BAY',
          name: 'San Francisco Bay Area',
          description: 'San Francisco Bay Area operating zone.',
        },
      ],
    });
  });
});
