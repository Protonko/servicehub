import { ServiceCategoryNotFoundError } from '@application/errors';
import { RequestPriority } from '@domain/model';
import { ServiceCatalogController } from '../service-catalog.controller';

describe('ServiceCatalogController', () => {
  const createController = () => {
    const listServiceCategoriesUseCase = {
      execute: jest.fn().mockResolvedValue({
        categories: [
          {
            id: 'category-id',
            code: 'HVAC',
            name: 'HVAC',
            description: null,
          },
        ],
      }),
    };
    const listServiceTypesUseCase = {
      execute: jest.fn().mockResolvedValue({
        serviceTypes: [
          {
            id: 'service-type-id',
            categoryId: 'category-id',
            code: 'AC_NOT_COOLING',
            name: 'Air conditioner does not cool',
            description: null,
            defaultPriority: RequestPriority.Normal,
            estimatedDurationMinutes: 90,
            isOther: false,
            slaPolicy: {
              id: 'sla-policy-id',
              code: 'STANDARD_24H',
              name: 'Standard 24 Hour Response',
            },
            requiredSkills: [
              {
                id: 'skill-id',
                code: 'HVAC_REPAIR',
                name: 'HVAC Repair',
              },
            ],
          },
        ],
      }),
    };
    const controller = new ServiceCatalogController(
      listServiceCategoriesUseCase as never,
      listServiceTypesUseCase as never,
    );

    return {
      controller,
      listServiceTypesUseCase,
    };
  };

  it('maps category list response', async () => {
    const { controller } = createController();

    await expect(controller.listCategories()).resolves.toEqual({
      data: [
        {
          id: 'category-id',
          code: 'HVAC',
          name: 'HVAC',
          description: null,
        },
      ],
    });
  });

  it('maps service type list response', async () => {
    const { controller } = createController();

    await expect(controller.listServiceTypes('category-id')).resolves.toEqual({
      data: [
        {
          id: 'service-type-id',
          categoryId: 'category-id',
          code: 'AC_NOT_COOLING',
          name: 'Air conditioner does not cool',
          description: null,
          defaultPriority: RequestPriority.Normal,
          estimatedDurationMinutes: 90,
          isOther: false,
          slaPolicy: {
            id: 'sla-policy-id',
            code: 'STANDARD_24H',
            name: 'Standard 24 Hour Response',
          },
          requiredSkills: [
            {
              id: 'skill-id',
              code: 'HVAC_REPAIR',
              name: 'HVAC Repair',
            },
          ],
        },
      ],
    });
  });

  it('maps missing category to not found response', async () => {
    const { controller, listServiceTypesUseCase } = createController();
    listServiceTypesUseCase.execute.mockRejectedValue(new ServiceCategoryNotFoundError());

    await expect(controller.listServiceTypes('missing-category-id')).rejects.toMatchObject({
      status: 404,
    });
  });
});
