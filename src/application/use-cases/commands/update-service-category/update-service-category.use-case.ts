import { Inject, Injectable } from '@nestjs/common';

import { EmptyServiceCatalogUpdateError, ServiceCategoryNotFoundError } from '@application/errors';
import {
  SERVICE_CATALOG_ADMIN_REPOSITORY,
  ServiceCatalogAdminRepository,
} from '@domain/repositories';
import { ServiceCategory, UpdateServiceCategoryInput } from '@domain/model';

export interface UpdateServiceCategoryCommand {
  categoryId: string;
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateServiceCategoryResult {
  category: ServiceCategory;
}

@Injectable()
export class UpdateServiceCategoryUseCase {
  constructor(
    @Inject(SERVICE_CATALOG_ADMIN_REPOSITORY)
    private readonly serviceCatalogAdminRepository: ServiceCatalogAdminRepository,
  ) {}

  async execute(command: UpdateServiceCategoryCommand): Promise<UpdateServiceCategoryResult> {
    if (
      command.name === undefined &&
      command.description === undefined &&
      command.isActive === undefined
    ) {
      throw new EmptyServiceCatalogUpdateError();
    }

    const existingCategory = await this.serviceCatalogAdminRepository.findCategoryById(
      command.categoryId,
    );

    if (!existingCategory) {
      throw new ServiceCategoryNotFoundError();
    }

    const update: UpdateServiceCategoryInput = {
      name: command.name,
      description: command.description,
      isActive: command.isActive,
    };
    const category = existingCategory.update(update);

    return { category: await this.serviceCatalogAdminRepository.saveCategory(category) };
  }
}
