import { RequestPriority, ServiceCategory, ServiceType } from '@domain/model';
import { ServiceCategoryEntity } from '@db/entities/service-category.entity';
import { ServiceTypeRequiredSkillEntity } from '@db/entities/service-type-required-skill.entity';
import { ServiceTypeEntity } from '@db/entities/service-type.entity';
import { ServiceCatalogAdminMapper } from '../service-catalog-admin.mapper';

describe('ServiceCatalogAdminMapper', () => {
  it('maps service category persistence data to a domain model', () => {
    const entity = new ServiceCategoryEntity();
    entity.id = 'category-id';
    entity.code = 'HVAC';
    entity.name = 'HVAC';
    entity.description = null;
    entity.isActive = true;
    entity.createdAt = new Date('2026-06-11T10:00:00.000Z');
    entity.updatedAt = new Date('2026-06-11T10:05:00.000Z');

    const category = ServiceCatalogAdminMapper.toCategoryDomain(entity);

    expect(category.id).toBe('category-id');
    expect(category.code).toBe('HVAC');
    expect(category.name).toBe('HVAC');
    expect(category.description).toBeNull();
    expect(category.isActive).toBe(true);
    expect(category.createdAt).toEqual(entity.createdAt);
    expect(category.updatedAt).toEqual(entity.updatedAt);
  });

  it('maps a domain service category to persistence fields', () => {
    const category = ServiceCategory.rehydrate({
      id: 'category-id',
      code: 'HVAC',
      name: 'HVAC',
      description: null,
      isActive: true,
    });

    const entity = ServiceCatalogAdminMapper.toCategoryEntity(category);

    expect(entity).toMatchObject({
      id: 'category-id',
      code: 'HVAC',
      name: 'HVAC',
      description: null,
      isActive: true,
    });
  });

  it('maps service type persistence data to a domain model', () => {
    const requiredSkill = new ServiceTypeRequiredSkillEntity();
    requiredSkill.serviceTypeId = 'service-type-id';
    requiredSkill.skillId = 'skill-id';

    const entity = new ServiceTypeEntity();
    entity.id = 'service-type-id';
    entity.categoryId = 'category-id';
    entity.slaPolicyId = 'sla-policy-id';
    entity.code = 'OUTLET_REPAIR';
    entity.name = 'Outlet repair';
    entity.description = null;
    entity.defaultPriority = RequestPriority.Normal;
    entity.estimatedDurationMinutes = 60;
    entity.isOther = false;
    entity.isActive = true;
    entity.requiredSkills = [requiredSkill];

    const serviceType = ServiceCatalogAdminMapper.toServiceTypeDomain(entity);

    expect(serviceType.id).toBe('service-type-id');
    expect(serviceType.categoryId).toBe('category-id');
    expect(serviceType.slaPolicyId).toBe('sla-policy-id');
    expect(serviceType.code).toBe('OUTLET_REPAIR');
    expect(serviceType.defaultPriority).toBe(RequestPriority.Normal);
    expect(serviceType.requiredSkillIds).toEqual(['skill-id']);
  });

  it('maps a domain service type to persistence fields', () => {
    const serviceType = ServiceType.rehydrate({
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
      requiredSkillIds: ['skill-id'],
    });

    const entity = ServiceCatalogAdminMapper.toServiceTypeEntity(serviceType);

    expect(entity).toMatchObject({
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
    });
  });
});
