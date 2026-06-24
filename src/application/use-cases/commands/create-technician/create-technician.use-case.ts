import { Inject, Injectable } from '@nestjs/common';

import {
  TechnicianServiceAreaNotFoundError,
  TechnicianSkillNotFoundError,
  TechnicianUserNotFoundError,
} from '@application/errors';
import { DuplicateTechnicianProfileError } from '@domain/exceptions';
import {
  SERVICE_AREA_READ_QUERY,
  ServiceAreaReadQuery,
} from '@application/queries/service-area-read.query';
import {
  SERVICE_CATALOG_ADMIN_REPOSITORY,
  ServiceCatalogAdminRepository,
  TECHNICIAN_REPOSITORY,
  TechnicianRepository,
  USER_REPOSITORY,
  UserRepository,
} from '@domain/repositories';
import { Technician, TechnicianStatus } from '@domain/model';
import { TechnicianProfilePolicy } from '@domain/policies/technician-profile.policy';

export interface CreateTechnicianCommand {
  userId: string;
  status?: TechnicianStatus;
  dailyAssignmentLimit: number;
  skillIds: string[];
  serviceAreaIds: string[];
}

export interface CreateTechnicianResult {
  technician: Technician;
}

@Injectable()
export class CreateTechnicianUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(TECHNICIAN_REPOSITORY)
    private readonly technicianRepository: TechnicianRepository,
    @Inject(SERVICE_CATALOG_ADMIN_REPOSITORY)
    private readonly serviceCatalogRepository: ServiceCatalogAdminRepository,
    @Inject(SERVICE_AREA_READ_QUERY)
    private readonly serviceAreaReadQuery: ServiceAreaReadQuery,
  ) {}

  async execute(command: CreateTechnicianCommand): Promise<CreateTechnicianResult> {
    const technician = Technician.create(command);
    const [user, existingTechnician, activeSkillIds, activeServiceAreaIds] = await Promise.all([
      this.userRepository.findById(technician.userId),
      this.technicianRepository.findByUserId(technician.userId),
      this.serviceCatalogRepository.findActiveSkillIds(technician.skillIds),
      this.serviceAreaReadQuery.findActiveServiceAreaIds(technician.serviceAreaIds),
    ]);

    if (!user) {
      throw new TechnicianUserNotFoundError();
    }

    TechnicianProfilePolicy.assertUserIsActive(user);

    if (existingTechnician) {
      throw new DuplicateTechnicianProfileError();
    }

    if (activeSkillIds.length !== technician.skillIds.length) {
      throw new TechnicianSkillNotFoundError();
    }

    if (activeServiceAreaIds.length !== technician.serviceAreaIds.length) {
      throw new TechnicianServiceAreaNotFoundError();
    }

    return { technician: await this.technicianRepository.save(technician) };
  }
}
