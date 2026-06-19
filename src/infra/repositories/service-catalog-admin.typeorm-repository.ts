import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { ServiceCategoryEntity } from '@db/entities/service-category.entity';
import { ServiceTypeRequiredSkillEntity } from '@db/entities/service-type-required-skill.entity';
import { ServiceTypeEntity } from '@db/entities/service-type.entity';
import { SkillEntity } from '@db/entities/skill.entity';
import { SlaPolicyEntity } from '@db/entities/sla-policy.entity';
import { ServiceCategory, ServiceType } from '@domain/model';
import {
  ServiceCatalogAdminRepository,
  ServiceRequestCatalogSnapshot,
} from '@domain/repositories/service-catalog-admin.repository';
import { ServiceCatalogAdminMapper } from '../mappers/service-catalog-admin.mapper';

@Injectable()
export class ServiceCatalogAdminTypeOrmRepository implements ServiceCatalogAdminRepository {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ServiceCategoryEntity)
    private readonly serviceCategoryRepository: Repository<ServiceCategoryEntity>,
    @InjectRepository(ServiceTypeEntity)
    private readonly serviceTypeRepository: Repository<ServiceTypeEntity>,
    @InjectRepository(SlaPolicyEntity)
    private readonly slaPolicyRepository: Repository<SlaPolicyEntity>,
    @InjectRepository(SkillEntity)
    private readonly skillRepository: Repository<SkillEntity>,
  ) {}

  async findCategoryById(categoryId: string): Promise<ServiceCategory | null> {
    const category = await this.serviceCategoryRepository.findOneBy({ id: categoryId });

    return category ? ServiceCatalogAdminMapper.toCategoryDomain(category) : null;
  }

  async findCategoryByCode(code: string): Promise<ServiceCategory | null> {
    const category = await this.serviceCategoryRepository.findOneBy({ code });

    return category ? ServiceCatalogAdminMapper.toCategoryDomain(category) : null;
  }

  async saveCategory(category: ServiceCategory): Promise<ServiceCategory> {
    const savedCategory = await this.serviceCategoryRepository.save(
      ServiceCatalogAdminMapper.toCategoryEntity(category),
    );

    return ServiceCatalogAdminMapper.toCategoryDomain(savedCategory);
  }

  async activeCategoryExists(categoryId: string): Promise<boolean> {
    return this.serviceCategoryRepository.existsBy({ id: categoryId, isActive: true });
  }

  async activeSlaPolicyExists(slaPolicyId: string): Promise<boolean> {
    return this.slaPolicyRepository.existsBy({ id: slaPolicyId, isActive: true });
  }

  async findActiveSkillIds(skillIds: string[]): Promise<string[]> {
    if (skillIds.length === 0) {
      return [];
    }

    const skills = await this.skillRepository.find({
      select: { id: true },
      where: {
        id: In(skillIds),
        isActive: true,
      },
    });

    return skills.map((skill) => skill.id);
  }

  async findServiceTypeById(serviceTypeId: string): Promise<ServiceType | null> {
    const serviceType = await this.serviceTypeRepository.findOne({
      where: { id: serviceTypeId },
      relations: { requiredSkills: true },
    });

    return serviceType ? ServiceCatalogAdminMapper.toServiceTypeDomain(serviceType) : null;
  }

  async findActiveServiceTypeForRequest(
    serviceTypeId: string,
  ): Promise<ServiceRequestCatalogSnapshot | null> {
    const serviceType = await this.serviceTypeRepository.findOne({
      where: {
        id: serviceTypeId,
        isActive: true,
        category: {
          isActive: true,
        },
        slaPolicy: {
          isActive: true,
        },
      },
      relations: {
        category: true,
        slaPolicy: true,
        requiredSkills: true,
      },
    });

    if (!serviceType || !serviceType.slaPolicy) {
      return null;
    }

    return {
      serviceType: ServiceCatalogAdminMapper.toServiceTypeDomain(serviceType),
      slaPolicy: {
        id: serviceType.slaPolicy.id,
        assignmentDeadlineMinutes: serviceType.slaPolicy.assignmentDeadlineMinutes,
        completionDeadlineMinutes: serviceType.slaPolicy.completionDeadlineMinutes,
        isActive: serviceType.slaPolicy.isActive,
      },
    };
  }

  async findServiceTypeByCategoryAndCode(
    categoryId: string,
    code: string,
  ): Promise<ServiceType | null> {
    const serviceType = await this.serviceTypeRepository.findOne({
      where: { categoryId, code },
      relations: { requiredSkills: true },
    });

    return serviceType ? ServiceCatalogAdminMapper.toServiceTypeDomain(serviceType) : null;
  }

  async findOtherServiceTypeInCategory(
    categoryId: string,
    excludingServiceTypeId?: string,
  ): Promise<ServiceType | null> {
    const query = this.serviceTypeRepository
      .createQueryBuilder('serviceType')
      .leftJoinAndSelect('serviceType.requiredSkills', 'requiredSkill')
      .where('serviceType.category_id = :categoryId', { categoryId })
      .andWhere('serviceType.is_other = true');

    if (excludingServiceTypeId) {
      query.andWhere('serviceType.id <> :excludingServiceTypeId', { excludingServiceTypeId });
    }

    const serviceType = await query.getOne();

    return serviceType ? ServiceCatalogAdminMapper.toServiceTypeDomain(serviceType) : null;
  }

  async saveServiceType(serviceType: ServiceType): Promise<ServiceType> {
    return this.dataSource.transaction(async (manager) => {
      const savedServiceType = await manager.save(
        ServiceTypeEntity,
        ServiceCatalogAdminMapper.toServiceTypeEntity(serviceType),
      );

      await manager.delete(ServiceTypeRequiredSkillEntity, { serviceTypeId: serviceType.id });

      if (serviceType.requiredSkillIds.length > 0) {
        await manager.insert(
          ServiceTypeRequiredSkillEntity,
          serviceType.requiredSkillIds.map((skillId) => ({
            serviceTypeId: serviceType.id,
            skillId,
          })),
        );
      }

      return ServiceCatalogAdminMapper.toServiceTypeDomain(
        savedServiceType,
        serviceType.requiredSkillIds,
      );
    });
  }
}
