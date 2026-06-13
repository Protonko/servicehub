import { Inject, Injectable } from '@nestjs/common';

import { ServiceCategoryNotFoundError } from '@application/errors';
import {
  SERVICE_CATALOG_READ_QUERY,
  ServiceCatalogReadQuery,
} from '@application/queries/service-catalog-read.query';
import { ServiceTypeSummary } from '@application/read-models';

export interface ListServiceTypesInput {
  categoryId: string;
}

export interface ListServiceTypesResult {
  serviceTypes: ServiceTypeSummary[];
}

@Injectable()
export class ListServiceTypesUseCase {
  constructor(
    @Inject(SERVICE_CATALOG_READ_QUERY)
    private readonly serviceCatalogReadQuery: ServiceCatalogReadQuery,
  ) {}

  async execute(input: ListServiceTypesInput): Promise<ListServiceTypesResult> {
    const categoryExists = await this.serviceCatalogReadQuery.activeCategoryExists(
      input.categoryId,
    );

    if (!categoryExists) {
      throw new ServiceCategoryNotFoundError();
    }

    const serviceTypes = await this.serviceCatalogReadQuery.listActiveServiceTypes(
      input.categoryId,
    );

    return { serviceTypes };
  }
}
