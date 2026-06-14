import { Inject, Injectable } from '@nestjs/common';

import {
  EmptyServiceCatalogUpdateError,
  ServiceTypeNotFoundError,
  ServiceTypeOtherAlreadyExistsError,
  SkillNotFoundError,
  SlaPolicyNotFoundError,
} from '@application/errors';
import {
  SERVICE_CATALOG_ADMIN_REPOSITORY,
  ServiceCatalogAdminRepository,
} from '@domain/repositories';
import { RequestPriority, ServiceType, UpdateServiceTypeInput } from '@domain/model';

export interface UpdateServiceTypeCommand {
  serviceTypeId: string;
  slaPolicyId?: string;
  name?: string;
  description?: string | null;
  defaultPriority?: RequestPriority;
  estimatedDurationMinutes?: number;
  isOther?: boolean;
  isActive?: boolean;
  requiredSkillIds?: string[];
}

export interface UpdateServiceTypeResult {
  serviceType: ServiceType;
}

@Injectable()
export class UpdateServiceTypeUseCase {
  constructor(
    @Inject(SERVICE_CATALOG_ADMIN_REPOSITORY)
    private readonly serviceCatalogAdminRepository: ServiceCatalogAdminRepository,
  ) {}

  async execute(command: UpdateServiceTypeCommand): Promise<UpdateServiceTypeResult> {
    const existingServiceType = await this.serviceCatalogAdminRepository.findServiceTypeById(
      command.serviceTypeId,
    );

    if (!existingServiceType) {
      throw new ServiceTypeNotFoundError();
    }

    const hasUpdate =
      command.slaPolicyId !== undefined ||
      command.name !== undefined ||
      command.description !== undefined ||
      command.defaultPriority !== undefined ||
      command.estimatedDurationMinutes !== undefined ||
      command.isOther !== undefined ||
      command.isActive !== undefined ||
      command.requiredSkillIds !== undefined;

    if (!hasUpdate) {
      throw new EmptyServiceCatalogUpdateError();
    }

    const update: UpdateServiceTypeInput = {
      slaPolicyId: command.slaPolicyId,
      name: command.name,
      description: command.description,
      defaultPriority: command.defaultPriority,
      estimatedDurationMinutes: command.estimatedDurationMinutes,
      isOther: command.isOther,
      isActive: command.isActive,
      requiredSkillIds: command.requiredSkillIds,
    };
    const serviceType = existingServiceType.update(update);

    if (command.slaPolicyId !== undefined) {
      const slaPolicyExists = await this.serviceCatalogAdminRepository.activeSlaPolicyExists(
        serviceType.slaPolicyId,
      );

      if (!slaPolicyExists) {
        throw new SlaPolicyNotFoundError();
      }
    }

    if (command.isOther !== undefined) {
      if (serviceType.isOther) {
        const existingOther =
          await this.serviceCatalogAdminRepository.findOtherServiceTypeInCategory(
            serviceType.categoryId,
            serviceType.id,
          );

        if (existingOther) {
          throw new ServiceTypeOtherAlreadyExistsError();
        }
      }
    }

    if (command.requiredSkillIds !== undefined) {
      const activeSkillIds = await this.serviceCatalogAdminRepository.findActiveSkillIds(
        serviceType.requiredSkillIds,
      );

      if (activeSkillIds.length !== serviceType.requiredSkillIds.length) {
        throw new SkillNotFoundError();
      }
    }

    return { serviceType: await this.serviceCatalogAdminRepository.saveServiceType(serviceType) };
  }
}
