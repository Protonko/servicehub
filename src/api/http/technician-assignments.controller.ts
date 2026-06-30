import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AuthenticatedActor } from '@application/auth';
import {
  TechnicianAssignmentReadForbiddenError,
  TechnicianNotFoundError,
} from '@application/errors';
import { ListTechnicianAssignmentsUseCase } from '@application/use-cases';
import { RoleCode } from '@domain/model';

import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import {
  ListTechnicianAssignmentsQueryDto,
  toTechnicianAssignmentListResponse,
} from './dto/technician-assignment.dto';
import { ApiErrorResponseFactory } from './factories/api-error-response.factory';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Controller('technician/assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TechnicianAssignmentsController {
  constructor(private readonly listAssignmentsUseCase: ListTechnicianAssignmentsUseCase) {}

  @Get()
  @Roles(RoleCode.Technician)
  async listAssignments(
    @CurrentUser() actor: AuthenticatedActor,
    @Query() dto: ListTechnicianAssignmentsQueryDto,
  ) {
    const criteria = this.toCriteria(dto);

    try {
      const result = await this.listAssignmentsUseCase.execute({ actor, criteria });

      return toTechnicianAssignmentListResponse(result.assignments);
    } catch (error) {
      if (error instanceof TechnicianNotFoundError) {
        throw new NotFoundException(
          ApiErrorResponseFactory.create('TECHNICIAN_NOT_FOUND', error.message),
        );
      }

      if (error instanceof TechnicianAssignmentReadForbiddenError) {
        throw new ForbiddenException(
          ApiErrorResponseFactory.create('TECHNICIAN_ASSIGNMENT_READ_FORBIDDEN', error.message),
        );
      }

      throw error;
    }
  }

  private toCriteria(dto: ListTechnicianAssignmentsQueryDto) {
    const from = dto.from ? new Date(dto.from) : undefined;
    const to = dto.to ? new Date(dto.to) : undefined;

    if (from && to && from.getTime() >= to.getTime()) {
      throw new BadRequestException(
        ApiErrorResponseFactory.create(
          'TECHNICIAN_ASSIGNMENT_FILTER_INVALID',
          'from must be earlier than to',
        ),
      );
    }

    return {
      status: dto.status,
      from,
      to,
    };
  }
}
