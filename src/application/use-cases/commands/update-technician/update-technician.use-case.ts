import { Inject, Injectable } from '@nestjs/common';

import {
  EmptyTechnicianUpdateError,
  TechnicianNotFoundError,
  TechnicianServiceAreaNotFoundError,
  TechnicianSkillNotFoundError,
} from '@application/errors';
import {
  SERVICE_AREA_READ_QUERY,
  ServiceAreaReadQuery,
} from '@application/queries/service-area-read.query';
import {
  SERVICE_CATALOG_ADMIN_REPOSITORY,
  ServiceCatalogAdminRepository,
  TECHNICIAN_REPOSITORY,
  TechnicianRepository,
} from '@domain/repositories';
import { Technician, TechnicianStatus } from '@domain/model';

export interface UpdateTechnicianCommand {
  technicianId: string;
  status?: TechnicianStatus;
  dailyAssignmentLimit?: number;
  skillIds?: string[];
  serviceAreaIds?: string[];
}

export interface UpdateTechnicianResult {
  technician: Technician;
}

@Injectable()
export class UpdateTechnicianUseCase {
  constructor(
    @Inject(TECHNICIAN_REPOSITORY)
    private readonly technicianRepository: TechnicianRepository,
    @Inject(SERVICE_CATALOG_ADMIN_REPOSITORY)
    private readonly serviceCatalogRepository: ServiceCatalogAdminRepository,
    @Inject(SERVICE_AREA_READ_QUERY)
    private readonly serviceAreaReadQuery: ServiceAreaReadQuery,
  ) {}

  async execute(command: UpdateTechnicianCommand): Promise<UpdateTechnicianResult> {
    if (
      command.status === undefined &&
      command.dailyAssignmentLimit === undefined &&
      command.skillIds === undefined &&
      command.serviceAreaIds === undefined
    ) {
      throw new EmptyTechnicianUpdateError();
    }

    const existingTechnician = await this.technicianRepository.findById(command.technicianId);

    if (!existingTechnician) {
      throw new TechnicianNotFoundError();
    }

    const technician = existingTechnician.update(command);
    const [activeSkillIds, activeServiceAreaIds] = await Promise.all([
      command.skillIds === undefined
        ? Promise.resolve(technician.skillIds)
        : this.serviceCatalogRepository.findActiveSkillIds(technician.skillIds),
      command.serviceAreaIds === undefined
        ? Promise.resolve(technician.serviceAreaIds)
        : this.serviceAreaReadQuery.findActiveServiceAreaIds(technician.serviceAreaIds),
    ]);

    if (activeSkillIds.length !== technician.skillIds.length) {
      throw new TechnicianSkillNotFoundError();
    }

    if (activeServiceAreaIds.length !== technician.serviceAreaIds.length) {
      throw new TechnicianServiceAreaNotFoundError();
    }

    return { technician: await this.technicianRepository.save(technician) };
  }
}
