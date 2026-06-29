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
  CreateTechnicianAvailabilityWindowUseCase,
  CreateTechnicianUseCase,
  ListTechniciansUseCase,
  UpdateTechnicianUseCase,
} from '@application/use-cases';
import {
  DuplicateTechnicianProfileError,
  InactiveTechnicianUserError,
  InvalidTechnicianAvailabilityWindowError,
} from '@domain/exceptions';
import { RoleCode } from '@domain/model';

import { Roles } from './decorators/roles.decorator';
import {
  CreateTechnicianAvailabilityWindowRequestDto,
  toTechnicianAvailabilityWindowResponse,
} from './dto/technician-availability.dto';
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
    private readonly createAvailabilityWindowUseCase: CreateTechnicianAvailabilityWindowUseCase,
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

  @Post(':technicianId/availability-windows')
  @Roles(RoleCode.Admin)
  async createAvailabilityWindow(
    @Param('technicianId', new ParseUUIDPipe()) technicianId: string,
    @Body() dto: CreateTechnicianAvailabilityWindowRequestDto,
  ) {
    try {
      const result = await this.createAvailabilityWindowUseCase.execute({
        technicianId,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        isAvailable: dto.isAvailable,
        reason: dto.reason,
      });

      return toTechnicianAvailabilityWindowResponse(result.availabilityWindow);
    } catch (error) {
      if (error instanceof InvalidTechnicianAvailabilityWindowError) {
        throw new BadRequestException(
          ApiErrorResponseFactory.create('TECHNICIAN_AVAILABILITY_INVALID', error.message),
        );
      }

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
