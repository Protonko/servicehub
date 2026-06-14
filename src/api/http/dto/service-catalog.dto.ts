import { ServiceCategorySummary, ServiceTypeSummary } from '@application/read-models';
import { RequestPriority } from '@domain/model';

export interface ServiceCategoryResponseDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export interface ServiceCategoryListResponseDto {
  data: ServiceCategoryResponseDto[];
}

export interface ServiceCatalogSlaPolicyResponseDto {
  id: string;
  code: string;
  name: string;
}

export interface ServiceCatalogSkillResponseDto {
  id: string;
  code: string;
  name: string;
}

export interface ServiceTypeResponseDto {
  id: string;
  categoryId: string;
  code: string;
  name: string;
  description: string | null;
  defaultPriority: RequestPriority;
  estimatedDurationMinutes: number;
  isOther: boolean;
  slaPolicy: ServiceCatalogSlaPolicyResponseDto;
  requiredSkills: ServiceCatalogSkillResponseDto[];
}

export interface ServiceTypeListResponseDto {
  data: ServiceTypeResponseDto[];
}

export const toServiceCategoryListResponse = (
  categories: ServiceCategorySummary[],
): ServiceCategoryListResponseDto => ({
  data: categories.map((category) => ({
    id: category.id,
    code: category.code,
    name: category.name,
    description: category.description,
  })),
});

export const toServiceTypeListResponse = (
  serviceTypes: ServiceTypeSummary[],
): ServiceTypeListResponseDto => ({
  data: serviceTypes.map((serviceType) => ({
    id: serviceType.id,
    categoryId: serviceType.categoryId,
    code: serviceType.code,
    name: serviceType.name,
    description: serviceType.description,
    defaultPriority: serviceType.defaultPriority,
    estimatedDurationMinutes: serviceType.estimatedDurationMinutes,
    isOther: serviceType.isOther,
    slaPolicy: {
      id: serviceType.slaPolicy.id,
      code: serviceType.slaPolicy.code,
      name: serviceType.slaPolicy.name,
    },
    requiredSkills: serviceType.requiredSkills.map((skill) => ({
      id: skill.id,
      code: skill.code,
      name: skill.name,
    })),
  })),
});
