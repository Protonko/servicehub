import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  EmptyTechnicianUpdateError,
  TechnicianNotFoundError,
  TechnicianServiceAreaNotFoundError,
  TechnicianSkillNotFoundError,
  TechnicianUserNotFoundError,
} from '@application/errors';
import {
  CreateTechnicianUseCase,
  ListTechniciansUseCase,
  UpdateTechnicianUseCase,
} from '@application/use-cases';
import { DuplicateTechnicianProfileError, InactiveTechnicianUserError } from '@domain/exceptions';
import { RoleCode } from '@domain/model';

import { Roles } from './decorators/roles.decorator';
import {
  CreateTechnicianRequestDto,
  UpdateTechnicianRequestDto,
  toTechnicianListResponse,
  toTechnicianResponse,
} from './dto/technician-management.dto';
import { ApiErrorResponseFactory } from './factories/api-error-response.factory';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Controller('admin/technicians')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.Admin, RoleCode.Dispatcher)
export class AdminTechniciansController {
  constructor(
    private readonly createTechnicianUseCase: CreateTechnicianUseCase,
    private readonly updateTechnicianUseCase: UpdateTechnicianUseCase,
    private readonly listTechniciansUseCase: ListTechniciansUseCase,
  ) {}

  @Get()
  async listTechnicians() {
    const result = await this.listTechniciansUseCase.execute();

    return toTechnicianListResponse(result.technicians);
  }

  @Post()
  @Roles(RoleCode.Admin)
  async createTechnician(@Body() dto: CreateTechnicianRequestDto) {
    try {
      const result = await this.createTechnicianUseCase.execute(dto);

      return toTechnicianResponse(result.technician);
    } catch (error) {
      this.mapTechnicianError(error);
    }
  }

  @Patch(':technicianId')
  @Roles(RoleCode.Admin)
  async updateTechnician(
    @Param('technicianId', new ParseUUIDPipe()) technicianId: string,
    @Body() dto: UpdateTechnicianRequestDto,
  ) {
    try {
      const result = await this.updateTechnicianUseCase.execute({ technicianId, ...dto });

      return toTechnicianResponse(result.technician);
    } catch (error) {
      this.mapTechnicianError(error);
    }
  }

  private mapTechnicianError(error: unknown): never {
    if (error instanceof EmptyTechnicianUpdateError) {
      throw new BadRequestException(ApiErrorResponseFactory.create('EMPTY_UPDATE', error.message));
    }

    if (error instanceof DuplicateTechnicianProfileError) {
      throw new ConflictException(
        ApiErrorResponseFactory.create('TECHNICIAN_PROFILE_ALREADY_EXISTS', error.message),
      );
    }

    if (error instanceof TechnicianNotFoundError) {
      throw new NotFoundException(
        ApiErrorResponseFactory.create('TECHNICIAN_NOT_FOUND', error.message),
      );
    }

    if (
      error instanceof TechnicianUserNotFoundError ||
      error instanceof InactiveTechnicianUserError
    ) {
      throw new NotFoundException(
        ApiErrorResponseFactory.create('TECHNICIAN_USER_NOT_FOUND', error.message),
      );
    }

    if (error instanceof TechnicianSkillNotFoundError) {
      throw new NotFoundException(
        ApiErrorResponseFactory.create('TECHNICIAN_SKILL_NOT_FOUND', error.message),
      );
    }

    if (error instanceof TechnicianServiceAreaNotFoundError) {
      throw new NotFoundException(
        ApiErrorResponseFactory.create('TECHNICIAN_SERVICE_AREA_NOT_FOUND', error.message),
      );
    }

    throw error;
  }
}
