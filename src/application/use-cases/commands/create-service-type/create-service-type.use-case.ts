import { Inject, Injectable } from '@nestjs/common';

import {
  DuplicateServiceTypeCodeError,
  ServiceCategoryNotFoundError,
  ServiceTypeOtherAlreadyExistsError,
  SkillNotFoundError,
  SlaPolicyNotFoundError,
} from '@application/errors';
import {
  SERVICE_CATALOG_ADMIN_REPOSITORY,
  ServiceCatalogAdminRepository,
} from '@domain/repositories';
import { RequestPriority, ServiceType } from '@domain/model';

export interface CreateServiceTypeCommand {
  categoryId: string;
  slaPolicyId: string;
  code: string;
  name: string;
  description?: string | null;
  defaultPriority: RequestPriority;
  estimatedDurationMinutes: number;
  isOther: boolean;
  isActive?: boolean;
  requiredSkillIds: string[];
}

export interface CreateServiceTypeResult {
  serviceType: ServiceType;
}

@Injectable()
export class CreateServiceTypeUseCase {
  constructor(
    @Inject(SERVICE_CATALOG_ADMIN_REPOSITORY)
    private readonly serviceCatalogAdminRepository: ServiceCatalogAdminRepository,
  ) {}

  async execute(command: CreateServiceTypeCommand): Promise<CreateServiceTypeResult> {
    const serviceType = ServiceType.create(command);

    const [categoryExists, slaPolicyExists, activeSkillIds, existingServiceType] =
      await Promise.all([
        this.serviceCatalogAdminRepository.activeCategoryExists(serviceType.categoryId),
        this.serviceCatalogAdminRepository.activeSlaPolicyExists(serviceType.slaPolicyId),
        this.serviceCatalogAdminRepository.findActiveSkillIds(serviceType.requiredSkillIds),
        this.serviceCatalogAdminRepository.findServiceTypeByCategoryAndCode(
          serviceType.categoryId,
          serviceType.code,
        ),
      ]);

    if (!categoryExists) {
      throw new ServiceCategoryNotFoundError();
    }

    if (!slaPolicyExists) {
      throw new SlaPolicyNotFoundError();
    }

    if (activeSkillIds.length !== serviceType.requiredSkillIds.length) {
      throw new SkillNotFoundError();
    }

    if (existingServiceType) {
      throw new DuplicateServiceTypeCodeError();
    }

    if (serviceType.isOther) {
      const existingOther = await this.serviceCatalogAdminRepository.findOtherServiceTypeInCategory(
        serviceType.categoryId,
      );

      if (existingOther) {
        throw new ServiceTypeOtherAlreadyExistsError();
      }
    }

    return { serviceType: await this.serviceCatalogAdminRepository.saveServiceType(serviceType) };
  }
}
