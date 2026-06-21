import { ServiceCategorySummary, ServiceTypeSummary } from '@application/read-models';

import { ServiceCategoryRow, ServiceTypeRow } from './service-catalog-read.types';

export class ServiceCatalogReadMapper {
  static toCategory(row: ServiceCategoryRow): ServiceCategorySummary {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
    };
  }

  static toServiceTypes(rows: ServiceTypeRow[]): ServiceTypeSummary[] {
    const serviceTypes = new Map<string, ServiceTypeSummary>();

    for (const row of rows) {
      const serviceType = serviceTypes.get(row.serviceTypeId) ?? this.toServiceType(row);

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

  private static toServiceType(row: ServiceTypeRow): ServiceTypeSummary {
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
