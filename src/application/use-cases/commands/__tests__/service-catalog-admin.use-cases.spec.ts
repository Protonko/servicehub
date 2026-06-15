import {
  DuplicateServiceCategoryCodeError,
  ServiceCategoryNotFoundError,
  SkillNotFoundError,
} from '@application/errors';
import { RequestPriority, ServiceCategory, ServiceType } from '@domain/model';
import { ServiceCatalogAdminRepository } from '@domain/repositories';
import { CreateServiceCategoryUseCase } from '../create-service-category/create-service-category.use-case';
import { CreateServiceTypeUseCase } from '../create-service-type/create-service-type.use-case';
import { UpdateServiceCategoryUseCase } from '../update-service-category/update-service-category.use-case';
import { UpdateServiceTypeUseCase } from '../update-service-type/update-service-type.use-case';

describe('Service catalog admin use cases', () => {
  const createRepository = () =>
    ({
      findCategoryById: jest.fn(),
      findCategoryByCode: jest.fn(),
      saveCategory: jest.fn(),
      activeCategoryExists: jest.fn(),
      activeSlaPolicyExists: jest.fn(),
      findActiveSkillIds: jest.fn(),
      findServiceTypeById: jest.fn(),
      findServiceTypeByCategoryAndCode: jest.fn(),
      findOtherServiceTypeInCategory: jest.fn(),
      saveServiceType: jest.fn(),
    }) as jest.Mocked<ServiceCatalogAdminRepository>;

  it('rejects duplicate category code before creating a category', async () => {
    const repository = createRepository();
    repository.findCategoryByCode.mockResolvedValue(
      ServiceCategory.rehydrate({
        id: 'category-id',
        code: 'HVAC',
        name: 'HVAC',
        description: null,
        isActive: true,
      }),
    );
    const useCase = new CreateServiceCategoryUseCase(repository);

    await expect(
      useCase.execute({
        code: ' hvac ',
        name: 'HVAC',
      }),
    ).rejects.toBeInstanceOf(DuplicateServiceCategoryCodeError);

    expect(repository.findCategoryByCode.mock.calls).toEqual([['HVAC']]);
    expect(repository.saveCategory.mock.calls).toHaveLength(0);
  });

  it('rejects category update when the category is missing', async () => {
    const repository = createRepository();
    repository.findCategoryById.mockResolvedValue(null);
    const useCase = new UpdateServiceCategoryUseCase(repository);

    await expect(
      useCase.execute({
        categoryId: 'missing-category-id',
        name: 'Updated',
      }),
    ).rejects.toBeInstanceOf(ServiceCategoryNotFoundError);
  });

  it('rejects service type creation when any required skill is inactive or missing', async () => {
    const repository = createRepository();
    repository.activeCategoryExists.mockResolvedValue(true);
    repository.activeSlaPolicyExists.mockResolvedValue(true);
    repository.findActiveSkillIds.mockResolvedValue(['active-skill-id']);
    repository.findServiceTypeByCategoryAndCode.mockResolvedValue(null);
    const useCase = new CreateServiceTypeUseCase(repository);

    await expect(
      useCase.execute({
        categoryId: 'category-id',
        slaPolicyId: 'sla-policy-id',
        code: 'OUTLET_REPAIR',
        name: 'Outlet repair',
        defaultPriority: RequestPriority.Normal,
        estimatedDurationMinutes: 60,
        isOther: false,
        requiredSkillIds: ['active-skill-id', 'inactive-skill-id'],
      }),
    ).rejects.toBeInstanceOf(SkillNotFoundError);

    expect(repository.saveServiceType.mock.calls).toHaveLength(0);
  });

  it('deduplicates required skill ids when creating a service type', async () => {
    const repository = createRepository();
    repository.activeCategoryExists.mockResolvedValue(true);
    repository.activeSlaPolicyExists.mockResolvedValue(true);
    repository.findActiveSkillIds.mockResolvedValue(['skill-id']);
    repository.findServiceTypeByCategoryAndCode.mockResolvedValue(null);
    repository.saveServiceType.mockImplementation((serviceType) => Promise.resolve(serviceType));
    const useCase = new CreateServiceTypeUseCase(repository);

    const result = await useCase.execute({
      categoryId: 'category-id',
      slaPolicyId: 'sla-policy-id',
      code: ' outlet_repair ',
      name: 'Outlet repair',
      defaultPriority: RequestPriority.Normal,
      estimatedDurationMinutes: 60,
      isOther: false,
      requiredSkillIds: ['skill-id', 'skill-id'],
    });

    const serviceTypeToSave = repository.saveServiceType.mock.calls[0][0];

    expect(serviceTypeToSave.code).toBe('OUTLET_REPAIR');
    expect(serviceTypeToSave.requiredSkillIds).toEqual(['skill-id']);
    expect(result.serviceType.requiredSkillIds).toEqual(['skill-id']);
  });

  it('replaces required skill ids when updating a service type', async () => {
    const repository = createRepository();
    repository.findServiceTypeById.mockResolvedValue(
      ServiceType.rehydrate({
        id: 'service-type-id',
        categoryId: 'category-id',
        slaPolicyId: 'sla-policy-id',
        code: 'OUTLET_REPAIR',
        name: 'Outlet repair',
        description: null,
        defaultPriority: RequestPriority.Normal,
        estimatedDurationMinutes: 60,
        isOther: false,
        isActive: true,
        requiredSkillIds: ['old-skill-id'],
      }),
    );
    repository.findActiveSkillIds.mockResolvedValue(['new-skill-id']);
    repository.saveServiceType.mockImplementation((serviceType) => Promise.resolve(serviceType));
    const useCase = new UpdateServiceTypeUseCase(repository);

    await expect(
      useCase.execute({
        serviceTypeId: 'service-type-id',
        requiredSkillIds: ['new-skill-id', 'new-skill-id'],
      }),
    ).resolves.toEqual({
      serviceType: expect.objectContaining({
        requiredSkillIds: ['new-skill-id'],
      }),
    });

    expect(repository.saveServiceType.mock.calls[0][0].requiredSkillIds).toEqual(['new-skill-id']);
  });
});
