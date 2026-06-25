import { Inject, Injectable } from '@nestjs/common';

import { TechnicianNotFoundError } from '@application/errors';
import { TechnicianAvailabilityWindow } from '@domain/model';
import {
  TECHNICIAN_AVAILABILITY_REPOSITORY,
  TECHNICIAN_REPOSITORY,
  TechnicianAvailabilityRepository,
  TechnicianRepository,
} from '@domain/repositories';

export interface CreateTechnicianAvailabilityWindowCommand {
  technicianId: string;
  startsAt: Date;
  endsAt: Date;
  isAvailable: boolean;
  reason?: string | null;
}

export interface CreateTechnicianAvailabilityWindowResult {
  availabilityWindow: TechnicianAvailabilityWindow;
}

@Injectable()
export class CreateTechnicianAvailabilityWindowUseCase {
  constructor(
    @Inject(TECHNICIAN_REPOSITORY)
    private readonly technicianRepository: TechnicianRepository,
    @Inject(TECHNICIAN_AVAILABILITY_REPOSITORY)
    private readonly availabilityRepository: TechnicianAvailabilityRepository,
  ) {}

  async execute(
    command: CreateTechnicianAvailabilityWindowCommand,
  ): Promise<CreateTechnicianAvailabilityWindowResult> {
    const technician = await this.technicianRepository.findById(command.technicianId);

    if (!technician) {
      throw new TechnicianNotFoundError();
    }

    const availabilityWindow = TechnicianAvailabilityWindow.create(command);

    return {
      availabilityWindow: await this.availabilityRepository.save(availabilityWindow),
    };
  }
}
