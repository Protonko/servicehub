import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ServiceCatalogReadQuery } from '@application/queries/service-catalog-read.query';
import { ServiceCategorySummary, ServiceTypeSummary } from '@application/read-models';
import { ServiceCategoryEntity } from '@db/entities/service-category.entity';
import { ServiceTypeEntity } from '@db/entities/service-type.entity';
import { RequestPriority } from '@domain/model';

interface ServiceTypeRow {
  serviceTypeId: string;
  categoryId: string;
  code: string;
  name: string;
  description: string | null;
  defaultPriority: RequestPriority;
  estimatedDurationMinutes: number;
  isOther: boolean;
  slaPolicyId: string;
  slaPolicyCode: string;
  slaPolicyName: string;
  skillId: string | null;
  skillCode: string | null;
  skillName: string | null;
}

@Injectable()
export class ServiceCatalogTypeOrmReadQuery implements ServiceCatalogReadQuery {
  constructor(
    @InjectRepository(ServiceCategoryEntity)
    private readonly serviceCategoryRepository: Repository<ServiceCategoryEntity>,
    @InjectRepository(ServiceTypeEntity)
    private readonly serviceTypeRepository: Repository<ServiceTypeEntity>,
  ) {}

  async listActiveCategories(): Promise<ServiceCategorySummary[]> {
    const categories = await this.serviceCategoryRepository
      .createQueryBuilder('category')
      .select([
        'category.id AS "id"',
        'category.code AS "code"',
        'category.name AS "name"',
        'category.description AS "description"',
      ])
      .where('category.is_active = true')
      .orderBy('category.name', 'ASC')
      .getRawMany<ServiceCategorySummary>();

    return categories;
  }

  async activeCategoryExists(categoryId: string): Promise<boolean> {
    const count = await this.serviceCategoryRepository
      .createQueryBuilder('category')
      .where('category.id = :categoryId', { categoryId })
      .andWhere('category.is_active = true')
      .getCount();

    return count > 0;
  }

  async listActiveServiceTypes(categoryId: string): Promise<ServiceTypeSummary[]> {
    const rows = await this.serviceTypeRepository
      .createQueryBuilder('serviceType')
      .innerJoin('serviceType.slaPolicy', 'slaPolicy', 'slaPolicy.is_active = true')
      .leftJoin('serviceType.requiredSkills', 'requiredSkill')
      .leftJoin('requiredSkill.skill', 'skill', 'skill.is_active = true')
      .select([
        'serviceType.id AS "serviceTypeId"',
        'serviceType.category_id AS "categoryId"',
        'serviceType.code AS "code"',
        'serviceType.name AS "name"',
        'serviceType.description AS "description"',
        'serviceType.default_priority AS "defaultPriority"',
        'serviceType.estimated_duration_minutes AS "estimatedDurationMinutes"',
        'serviceType.is_other AS "isOther"',
        'slaPolicy.id AS "slaPolicyId"',
        'slaPolicy.code AS "slaPolicyCode"',
        'slaPolicy.name AS "slaPolicyName"',
        'skill.id AS "skillId"',
        'skill.code AS "skillCode"',
        'skill.name AS "skillName"',
      ])
      .where('serviceType.category_id = :categoryId', { categoryId })
      .andWhere('serviceType.is_active = true')
      .orderBy('serviceType.name', 'ASC')
      .addOrderBy('skill.name', 'ASC')
      .getRawMany<ServiceTypeRow>();

    const serviceTypes = new Map<string, ServiceTypeSummary>();

    for (const row of rows) {
      const serviceType = serviceTypes.get(row.serviceTypeId) ?? this.createServiceTypeSummary(row);

      if (row.skillId && row.skillCode && row.skillName) {
        serviceType.requiredSkills.push({
          id: row.skillId,
          code: row.skillCode,
          name: row.skillName,
        });
      }

      serviceTypes.set(row.serviceTypeId, serviceType);
    }

    return [...serviceTypes.values()];
  }

  private createServiceTypeSummary(row: ServiceTypeRow): ServiceTypeSummary {
    return {
      id: row.serviceTypeId,
      categoryId: row.categoryId,
      code: row.code,
      name: row.name,
      description: row.description,
      defaultPriority: row.defaultPriority,
      estimatedDurationMinutes: Number(row.estimatedDurationMinutes),
      isOther: row.isOther,
      slaPolicy: {
        id: row.slaPolicyId,
        code: row.slaPolicyCode,
        name: row.slaPolicyName,
      },
      requiredSkills: [],
    };
  }
}
