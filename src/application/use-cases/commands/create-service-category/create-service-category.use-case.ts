import { Inject, Injectable } from '@nestjs/common';

import { DuplicateServiceCategoryCodeError } from '@application/errors';
import {
  SERVICE_CATALOG_ADMIN_REPOSITORY,
  ServiceCatalogAdminRepository,
} from '@domain/repositories';
import { ServiceCategory } from '@domain/model';

export interface CreateServiceCategoryCommand {
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface CreateServiceCategoryResult {
  category: ServiceCategory;
}

@Injectable()
export class CreateServiceCategoryUseCase {
  constructor(
    @Inject(SERVICE_CATALOG_ADMIN_REPOSITORY)
    private readonly serviceCatalogAdminRepository: ServiceCatalogAdminRepository,
  ) {}

  async execute(command: CreateServiceCategoryCommand): Promise<CreateServiceCategoryResult> {
    const category = ServiceCategory.create(command);
    const existingCategory = await this.serviceCatalogAdminRepository.findCategoryByCode(
      category.code,
    );

    if (existingCategory) {
      throw new DuplicateServiceCategoryCodeError();
    }

    return { category: await this.serviceCatalogAdminRepository.saveCategory(category) };
  }
}
