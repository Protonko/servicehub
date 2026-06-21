import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ServiceCatalogReadQuery } from '@application/queries/service-catalog-read.query';
import { ServiceCategorySummary, ServiceTypeSummary } from '@application/read-models';
import { ServiceCategoryEntity } from '@db/entities/service-category.entity';
import { ServiceTypeEntity } from '@db/entities/service-type.entity';

import { ServiceCatalogReadMapper } from './service-catalog-read.mapper';
import { ServiceCategoryRow, ServiceTypeRow } from './service-catalog-read.types';

@Injectable()
export class ServiceCatalogTypeOrmReadQuery implements ServiceCatalogReadQuery {
  constructor(
    @InjectRepository(ServiceCategoryEntity)
    private readonly serviceCategoryRepository: Repository<ServiceCategoryEntity>,
    @InjectRepository(ServiceTypeEntity)
    private readonly serviceTypeRepository: Repository<ServiceTypeEntity>,
  ) {}

  async listActiveCategories(): Promise<ServiceCategorySummary[]> {
    const rows = await this.serviceCategoryRepository
      .createQueryBuilder('category')
      .select([
        'category.id AS "id"',
        'category.code AS "code"',
        'category.name AS "name"',
        'category.description AS "description"',
      ])
      .where('category.is_active = true')
      .orderBy('category.name', 'ASC')
      .getRawMany<ServiceCategoryRow>();

    return rows.map((row) => ServiceCatalogReadMapper.toCategory(row));
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

    return ServiceCatalogReadMapper.toServiceTypes(rows);
  }
}
