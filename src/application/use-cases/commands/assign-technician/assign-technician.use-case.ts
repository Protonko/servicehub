import { Inject, Injectable } from '@nestjs/common';

import { AuthenticatedActor } from '@application/auth';
import {
  AssignmentForbiddenError,
  ServiceRequestNotFoundError,
  TechnicianNotFoundError,
} from '@application/errors';
import { Assignment, AssignmentTimeSlot, RoleCode } from '@domain/model';
import { AssignmentPolicy, TechnicianEligibilityPolicy } from '@domain/policies';
import {
  ASSIGNMENT_REPOSITORY,
  AssignedTechnician,
  AssignmentRepository,
} from '@domain/repositories';

export interface AssignTechnicianCommand {
  actor: AuthenticatedActor;
  requestId: string;
  technicianId: string;
  startsAt: Date;
  endsAt: Date;
}

export interface AssignTechnicianResult {
  assigned: AssignedTechnician;
}

@Injectable()
export class AssignTechnicianUseCase {
  constructor(
    @Inject(ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepository: AssignmentRepository,
  ) {}

  async execute(command: AssignTechnicianCommand): Promise<AssignTechnicianResult> {
    if (
      !command.actor.roles.some((role) => role === RoleCode.Dispatcher || role === RoleCode.Admin)
    ) {
      throw new AssignmentForbiddenError();
    }

    const slot = AssignmentTimeSlot.create({ startsAt: command.startsAt, endsAt: command.endsAt });

    const assigned = await this.assignmentRepository.executeTransaction(
      { requestId: command.requestId, technicianId: command.technicianId },
      async (context) => {
        if (!context.requestSnapshot) {
          throw new ServiceRequestNotFoundError();
        }

        if (!context.technicianSnapshot) {
          throw new TechnicianNotFoundError();
        }

        const { request, requiredSkillIds, serviceAreaId } = context.requestSnapshot;
        const { technician, availabilityWindows } = context.technicianSnapshot;

        AssignmentPolicy.assertRequestCanBeAssigned(request);
        TechnicianEligibilityPolicy.assertEligible({
          technician,
          requiredSkillIds,
          serviceAreaId,
          availabilityWindows,
          slot,
        });
        AssignmentPolicy.assertNoActiveScheduleOverlap(
          await context.hasActiveOverlap(technician.id, slot),
        );

        const assignedAt = new Date();
        const assignment = Assignment.create({
          serviceRequestId: request.id,
          technicianId: technician.id,
          assignedByUserId: command.actor.userId,
          slot,
        });

        return context.saveAssignmentOutcome({
          request: request.assign(assignedAt),
          assignment,
          actorUserId: command.actor.userId,
        });
      },
    );

    return { assigned };
  }
}
