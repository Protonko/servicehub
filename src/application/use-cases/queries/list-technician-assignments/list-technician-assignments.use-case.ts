import { Inject, Injectable } from '@nestjs/common';

import { AuthenticatedActor } from '@application/auth';
import {
  TechnicianAssignmentReadForbiddenError,
  TechnicianNotFoundError,
} from '@application/errors';
import {
  TECHNICIAN_ASSIGNMENT_READ_QUERY,
  TechnicianAssignmentCriteria,
  TechnicianAssignmentReadQuery,
} from '@application/queries/technician-assignment-read.query';
import { TechnicianAssignmentItem } from '@application/read-models';
import { RoleCode } from '@domain/model';
import { TECHNICIAN_REPOSITORY, TechnicianRepository } from '@domain/repositories';

export interface ListTechnicianAssignmentsInput {
  actor: AuthenticatedActor;
  criteria: TechnicianAssignmentCriteria;
}

export interface ListTechnicianAssignmentsResult {
  assignments: TechnicianAssignmentItem[];
}

@Injectable()
export class ListTechnicianAssignmentsUseCase {
  constructor(
    @Inject(TECHNICIAN_REPOSITORY)
    private readonly technicianRepository: TechnicianRepository,
    @Inject(TECHNICIAN_ASSIGNMENT_READ_QUERY)
    private readonly technicianAssignmentReadQuery: TechnicianAssignmentReadQuery,
  ) {}

  async execute(input: ListTechnicianAssignmentsInput): Promise<ListTechnicianAssignmentsResult> {
    if (!input.actor.roles.includes(RoleCode.Technician)) {
      throw new TechnicianAssignmentReadForbiddenError();
    }

    const technician = await this.technicianRepository.findByUserId(input.actor.userId);

    if (!technician) {
      throw new TechnicianNotFoundError();
    }

    return {
      assignments: await this.technicianAssignmentReadQuery.listForTechnician(
        technician.id,
        input.criteria,
      ),
    };
  }
}
