import { ServiceCategoryNotFoundError } from '@application/errors';
import { ListServiceTypesUseCase } from './list-service-types.use-case';

describe('ListServiceTypesUseCase', () => {
  it('returns service types for an active category', async () => {
    const serviceCatalogReadQuery = {
      activeCategoryExists: jest.fn().mockResolvedValue(true),
      listActiveServiceTypes: jest.fn().mockResolvedValue([
        {
          id: 'service-type-id',
          categoryId: 'category-id',
          code: 'AC_NOT_COOLING',
          name: 'Air conditioner does not cool',
          description: null,
          defaultPriority: 'normal',
          estimatedDurationMinutes: 90,
          isOther: false,
          slaPolicy: {
            id: 'sla-policy-id',
            code: 'STANDARD_24H',
            name: 'Standard 24 Hour Response',
          },
          requiredSkills: [],
        },
      ]),
    };
    const useCase = new ListServiceTypesUseCase(serviceCatalogReadQuery as never);

    await expect(useCase.execute({ categoryId: 'category-id' })).resolves.toEqual({
      serviceTypes: [
        {
          id: 'service-type-id',
          categoryId: 'category-id',
          code: 'AC_NOT_COOLING',
          name: 'Air conditioner does not cool',
          description: null,
          defaultPriority: 'normal',
          estimatedDurationMinutes: 90,
          isOther: false,
          slaPolicy: {
            id: 'sla-policy-id',
            code: 'STANDARD_24H',
            name: 'Standard 24 Hour Response',
          },
          requiredSkills: [],
        },
      ],
    });
    expect(serviceCatalogReadQuery.listActiveServiceTypes).toHaveBeenCalledWith('category-id');
  });

  it('throws not found when category is absent or inactive', async () => {
    const serviceCatalogReadQuery = {
      activeCategoryExists: jest.fn().mockResolvedValue(false),
      listActiveServiceTypes: jest.fn(),
    };
    const useCase = new ListServiceTypesUseCase(serviceCatalogReadQuery as never);

    await expect(useCase.execute({ categoryId: 'missing-category-id' })).rejects.toBeInstanceOf(
      ServiceCategoryNotFoundError,
    );
    expect(serviceCatalogReadQuery.listActiveServiceTypes).not.toHaveBeenCalled();
  });
});
