import { ServiceCategorySummary, ServiceTypeSummary } from '@application/read-models';

export const SERVICE_CATALOG_READ_QUERY = Symbol('SERVICE_CATALOG_READ_QUERY');

export interface ServiceCatalogReadQuery {
  listActiveCategories(): Promise<ServiceCategorySummary[]>;
  activeCategoryExists(categoryId: string): Promise<boolean>;
  listActiveServiceTypes(categoryId: string): Promise<ServiceTypeSummary[]>;
}
