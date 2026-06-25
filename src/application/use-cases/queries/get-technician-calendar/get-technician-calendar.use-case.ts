import { Inject, Injectable } from '@nestjs/common';

import { AuthenticatedActor } from '@application/auth';
import { TechnicianCalendarForbiddenError, TechnicianNotFoundError } from '@application/errors';
import {
  TECHNICIAN_CALENDAR_READ_QUERY,
  TechnicianCalendarReadQuery,
} from '@application/queries/technician-calendar-read.query';
import { TechnicianCalendar } from '@application/read-models';
import { RoleCode } from '@domain/model';
import { TECHNICIAN_REPOSITORY, TechnicianRepository } from '@domain/repositories';

export interface GetTechnicianCalendarInput {
  actor: AuthenticatedActor;
  technicianId: string;
}

export interface GetTechnicianCalendarResult {
  calendar: TechnicianCalendar;
}

@Injectable()
export class GetTechnicianCalendarUseCase {
  constructor(
    @Inject(TECHNICIAN_REPOSITORY)
    private readonly technicianRepository: TechnicianRepository,
    @Inject(TECHNICIAN_CALENDAR_READ_QUERY)
    private readonly calendarReadQuery: TechnicianCalendarReadQuery,
  ) {}

  async execute(input: GetTechnicianCalendarInput): Promise<GetTechnicianCalendarResult> {
    const technician = await this.technicianRepository.findById(input.technicianId);

    if (!technician) {
      throw new TechnicianNotFoundError();
    }

    const canReadAny = input.actor.roles.some(
      (role) => role === RoleCode.Admin || role === RoleCode.Dispatcher,
    );
    const isOwnTechnician =
      input.actor.roles.includes(RoleCode.Technician) && input.actor.userId === technician.userId;

    if (!canReadAny && !isOwnTechnician) {
      throw new TechnicianCalendarForbiddenError();
    }

    return {
      calendar: {
        technicianId: technician.id,
        availabilityWindows: await this.calendarReadQuery.listAvailabilityWindows(technician.id),
      },
    };
  }
}
