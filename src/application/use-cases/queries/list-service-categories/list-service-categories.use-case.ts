import { Inject, Injectable } from '@nestjs/common';

import {
  SERVICE_CATALOG_READ_QUERY,
  ServiceCatalogReadQuery,
} from '@application/queries/service-catalog-read.query';
import { ServiceCategorySummary } from '@application/read-models';

export interface ListServiceCategoriesResult {
  categories: ServiceCategorySummary[];
}

@Injectable()
export class ListServiceCategoriesUseCase {
  constructor(
    @Inject(SERVICE_CATALOG_READ_QUERY)
    private readonly serviceCatalogReadQuery: ServiceCatalogReadQuery,
  ) {}

  async execute(): Promise<ListServiceCategoriesResult> {
    const categories = await this.serviceCatalogReadQuery.listActiveCategories();

    return { categories };
  }
}
