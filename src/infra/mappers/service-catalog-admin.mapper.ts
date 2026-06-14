import { RequestPriority, ServiceCategory, ServiceType } from '@domain/model';
import { ServiceCategoryEntity } from '@db/entities/service-category.entity';
import { ServiceTypeEntity } from '@db/entities/service-type.entity';

export class ServiceCatalogAdminMapper {
  static toCategoryDomain(entity: ServiceCategoryEntity): ServiceCategory {
    return ServiceCategory.rehydrate({
      id: entity.id,
      code: entity.code,
      name: entity.name,
      description: entity.description,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toCategoryEntity(category: ServiceCategory): ServiceCategoryEntity {
    const entity = new ServiceCategoryEntity();

    entity.id = category.id;
    entity.code = category.code;
    entity.name = category.name;
    entity.description = category.description;
    entity.isActive = category.isActive;

    return entity;
  }

  static toServiceTypeDomain(
    entity: ServiceTypeEntity,
    requiredSkillIds = entity.requiredSkills?.map((requiredSkill) => requiredSkill.skillId) ?? [],
  ): ServiceType {
    return ServiceType.rehydrate({
      id: entity.id,
      categoryId: entity.categoryId,
      slaPolicyId: entity.slaPolicyId,
      code: entity.code,
      name: entity.name,
      description: entity.description,
      defaultPriority: entity.defaultPriority as RequestPriority,
      estimatedDurationMinutes: entity.estimatedDurationMinutes,
      isOther: entity.isOther,
      isActive: entity.isActive,
      requiredSkillIds,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toServiceTypeEntity(serviceType: ServiceType): ServiceTypeEntity {
    const entity = new ServiceTypeEntity();

    entity.id = serviceType.id;
    entity.categoryId = serviceType.categoryId;
    entity.slaPolicyId = serviceType.slaPolicyId;
    entity.code = serviceType.code;
    entity.name = serviceType.name;
    entity.description = serviceType.description;
    entity.defaultPriority = serviceType.defaultPriority;
    entity.estimatedDurationMinutes = serviceType.estimatedDurationMinutes;
    entity.isOther = serviceType.isOther;
    entity.isActive = serviceType.isActive;

    return entity;
  }
}
