import { ServiceCategory, ServiceType } from '@domain/model';

export const SERVICE_CATALOG_ADMIN_REPOSITORY = Symbol('SERVICE_CATALOG_ADMIN_REPOSITORY');

export interface ServiceRequestCatalogSnapshot {
  serviceType: ServiceType;
  slaPolicy: {
    id: string;
    assignmentDeadlineMinutes: number;
    completionDeadlineMinutes: number;
    isActive: boolean;
  };
}

export interface ServiceCatalogAdminRepository {
  findCategoryById(categoryId: string): Promise<ServiceCategory | null>;
  findCategoryByCode(code: string): Promise<ServiceCategory | null>;
  saveCategory(category: ServiceCategory): Promise<ServiceCategory>;

  activeCategoryExists(categoryId: string): Promise<boolean>;
  activeSlaPolicyExists(slaPolicyId: string): Promise<boolean>;
  findActiveSkillIds(skillIds: string[]): Promise<string[]>;

  findServiceTypeById(serviceTypeId: string): Promise<ServiceType | null>;
  findActiveServiceTypeForRequest(
    serviceTypeId: string,
  ): Promise<ServiceRequestCatalogSnapshot | null>;
  findServiceTypeByCategoryAndCode(categoryId: string, code: string): Promise<ServiceType | null>;
  findOtherServiceTypeInCategory(
    categoryId: string,
    excludingServiceTypeId?: string,
  ): Promise<ServiceType | null>;
  saveServiceType(serviceType: ServiceType): Promise<ServiceType>;
}
