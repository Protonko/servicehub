import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';

import { AuthenticatedActor } from '@application/auth';
import { TechnicianCalendarForbiddenError, TechnicianNotFoundError } from '@application/errors';
import { GetTechnicianCalendarUseCase } from '@application/use-cases';
import { RoleCode } from '@domain/model';

import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { toTechnicianCalendarResponse } from './dto/technician-availability.dto';
import { ApiErrorResponseFactory } from './factories/api-error-response.factory';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Controller('technicians')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TechniciansController {
  constructor(private readonly getTechnicianCalendarUseCase: GetTechnicianCalendarUseCase) {}

  @Get(':technicianId/calendar')
  @Roles(RoleCode.Dispatcher, RoleCode.Admin, RoleCode.Technician)
  async getCalendar(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('technicianId', new ParseUUIDPipe()) technicianId: string,
  ) {
    try {
      const result = await this.getTechnicianCalendarUseCase.execute({ actor, technicianId });

      return toTechnicianCalendarResponse(result.calendar);
    } catch (error) {
      if (error instanceof TechnicianNotFoundError) {
        throw new NotFoundException(
          ApiErrorResponseFactory.create('TECHNICIAN_NOT_FOUND', error.message),
        );
      }

      if (error instanceof TechnicianCalendarForbiddenError) {
        throw new ForbiddenException(
          ApiErrorResponseFactory.create('TECHNICIAN_CALENDAR_FORBIDDEN', error.message),
        );
      }

      throw error;
    }
  }
}
