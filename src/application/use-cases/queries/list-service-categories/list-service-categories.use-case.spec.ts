import { ListServiceCategoriesUseCase } from './list-service-categories.use-case';

describe('ListServiceCategoriesUseCase', () => {
  it('returns active categories from the catalog read query', async () => {
    const serviceCatalogReadQuery = {
      listActiveCategories: jest.fn().mockResolvedValue([
        {
          id: 'category-id',
          code: 'HVAC',
          name: 'HVAC',
          description: null,
        },
      ]),
    };
    const useCase = new ListServiceCategoriesUseCase(serviceCatalogReadQuery as never);

    await expect(useCase.execute()).resolves.toEqual({
      categories: [
        {
          id: 'category-id',
          code: 'HVAC',
          name: 'HVAC',
          description: null,
        },
      ],
    });
  });
});
