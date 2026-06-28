import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AuthenticatedActor } from '@application/auth';
import {
  AssignmentForbiddenError,
  ServiceRequestAddressNotFoundError,
  ServiceRequestCategoryNotFoundError,
  ServiceRequestPreferredWindowInPastError,
  ServiceRequestNotFoundError,
  ServiceRequestReadForbiddenError,
  ServiceRequestServiceTypeCategoryMismatchError,
  ServiceRequestServiceTypeNotFoundError,
  ServiceRequestTriageDuplicateSkillsError,
  ServiceRequestTriageForbiddenError,
  ServiceRequestTriageSkillNotFoundError,
  InvalidTechnicianEligibilityWindowError,
  ServiceRequestNotAssignableForEligibilityError,
  TechnicianNotFoundError,
} from '@application/errors';
import {
  AssignTechnicianUseCase,
  CreateServiceRequestUseCase,
  GetServiceRequestUseCase,
  GetEligibleTechniciansUseCase,
  SearchServiceRequestsUseCase,
  TriageServiceRequestUseCase,
} from '@application/use-cases';
import {
  InvalidAssignmentTimeSlotError,
  ServiceRequestCannotBeAssignedError,
  ServiceRequestCannotBeTriagedError,
  ServiceRequestOtherTypeCannotBeTriagedError,
  ServiceRequestTriageConflictError,
  TechnicianMissingRequiredSkillsError,
  TechnicianNotActiveForAssignmentError,
  TechnicianOutsideServiceAreaError,
  TechnicianScheduleOverlapError,
  TechnicianUnavailableForAssignmentError,
} from '@domain/exceptions';
import { RoleCode } from '@domain/model';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import {
  CreateServiceRequestRequestDto,
  TriageServiceRequestRequestDto,
  toTriagedServiceRequestResponse,
  toServiceRequestResponse,
} from './dto/service-request.dto';
import {
  SearchServiceRequestsQueryDto,
  toServiceRequestDetailResponse,
  toServiceRequestListResponse,
} from './dto/service-request-read.dto';
import { ApiErrorResponseFactory } from './factories/api-error-response.factory';
import {
  EligibleTechniciansQueryDto,
  toEligibleTechnicianSearchResponse,
} from './dto/eligible-technician.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AssignTechnicianRequestDto, toAssignmentResponse } from './dto/assignment.dto';

@Controller('service-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceRequestsController {
  constructor(
    private readonly assignTechnicianUseCase: AssignTechnicianUseCase,
    private readonly createServiceRequestUseCase: CreateServiceRequestUseCase,
    private readonly searchServiceRequestsUseCase: SearchServiceRequestsUseCase,
    private readonly getServiceRequestUseCase: GetServiceRequestUseCase,
    private readonly getEligibleTechniciansUseCase: GetEligibleTechniciansUseCase,
    private readonly triageServiceRequestUseCase: TriageServiceRequestUseCase,
  ) {}

  @Post(':requestId/assignments')
  @Roles(RoleCode.Dispatcher, RoleCode.Admin)
  async assignTechnician(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Body() dto: AssignTechnicianRequestDto,
  ) {
    try {
      const result = await this.assignTechnicianUseCase.execute({
        actor,
        requestId,
        technicianId: dto.technicianId,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
      });

      return toAssignmentResponse(result.assigned);
    } catch (error) {
      this.mapAssignTechnicianError(error);
    }
  }

  @Post()
  @Roles(RoleCode.Customer)
  async createRequest(
    @CurrentUser() actor: AuthenticatedActor,
    @Body() dto: CreateServiceRequestRequestDto,
  ) {
    try {
      const result = await this.createServiceRequestUseCase.execute({
        customerId: actor.userId,
        categoryId: dto.categoryId,
        serviceTypeId: dto.serviceTypeId,
        addressId: dto.addressId,
        description: dto.description,
        additionalContactInstructions: dto.additionalContactInstructions,
        preferredStartAt: new Date(dto.preferredStartAt),
        preferredEndAt: new Date(dto.preferredEndAt),
        attachments: dto.attachments ?? [],
      });

      return toServiceRequestResponse(result.created);
    } catch (error) {
      this.mapCreateServiceRequestError(error);
    }
  }

  @Get()
  @Roles(RoleCode.Customer, RoleCode.Dispatcher, RoleCode.Admin)
  async searchRequests(
    @CurrentUser() actor: AuthenticatedActor,
    @Query() dto: SearchServiceRequestsQueryDto,
  ) {
    try {
      const result = await this.searchServiceRequestsUseCase.execute({
        actor,
        criteria: {
          status: dto.status,
          priority: dto.priority,
          categoryId: dto.categoryId,
          serviceTypeId: dto.serviceTypeId,
          createdFrom: dto.createdFrom ? new Date(dto.createdFrom) : undefined,
          createdTo: dto.createdTo ? new Date(dto.createdTo) : undefined,
        },
        pagination: { limit: dto.limit, offset: dto.offset },
      });

      return toServiceRequestListResponse(result.requests, {
        limit: result.limit,
        offset: result.offset,
        total: result.total,
      });
    } catch (error) {
      this.mapReadServiceRequestError(error);
    }
  }

  @Patch(':requestId/triage')
  @Roles(RoleCode.Dispatcher, RoleCode.Admin)
  async triageRequest(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Body() dto: TriageServiceRequestRequestDto,
  ) {
    try {
      const result = await this.triageServiceRequestUseCase.execute({
        actor,
        requestId,
        categoryId: dto.categoryId,
        serviceTypeId: dto.serviceTypeId,
        priority: dto.priority,
        estimatedDurationMinutes: dto.estimatedDurationMinutes,
        requiredSkillIds: dto.requiredSkillIds,
      });

      return toTriagedServiceRequestResponse(result.triaged);
    } catch (error) {
      this.mapTriageServiceRequestError(error);
    }
  }

  @Get(':requestId')
  @Roles(RoleCode.Customer, RoleCode.Dispatcher, RoleCode.Admin)
  async getRequest(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
  ) {
    try {
      const result = await this.getServiceRequestUseCase.execute({ actor, requestId });

      return toServiceRequestDetailResponse(result.request);
    } catch (error) {
      this.mapReadServiceRequestError(error);
    }
  }

  @Get(':requestId/eligible-technicians')
  @Roles(RoleCode.Dispatcher, RoleCode.Admin)
  async getEligibleTechnicians(
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Query() dto: EligibleTechniciansQueryDto,
  ) {
    try {
      const result = await this.getEligibleTechniciansUseCase.execute({
        requestId,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
      });

      return toEligibleTechnicianSearchResponse(result);
    } catch (error) {
      if (error instanceof ServiceRequestNotFoundError) {
        throw new NotFoundException(
          ApiErrorResponseFactory.create('SERVICE_REQUEST_NOT_FOUND', error.message),
        );
      }

      if (error instanceof InvalidTechnicianEligibilityWindowError) {
        throw new BadRequestException(
          ApiErrorResponseFactory.create('TECHNICIAN_ELIGIBILITY_WINDOW_INVALID', error.message),
        );
      }

      if (error instanceof ServiceRequestNotAssignableForEligibilityError) {
        throw new ConflictException(
          ApiErrorResponseFactory.create('SERVICE_REQUEST_NOT_ASSIGNABLE', error.message),
        );
      }

      throw error;
    }
  }

  private mapCreateServiceRequestError(error: unknown): never {
    if (error instanceof ServiceRequestPreferredWindowInPastError) {
      throw new BadRequestException(
        ApiErrorResponseFactory.create('SERVICE_REQUEST_VALIDATION_FAILED', error.message),
      );
    }

    if (error instanceof ServiceRequestCategoryNotFoundError) {
      throw new NotFoundException(
        ApiErrorResponseFactory.create('SERVICE_CATEGORY_NOT_FOUND', error.message),
      );
    }

    if (error instanceof ServiceRequestServiceTypeNotFoundError) {
      throw new NotFoundException(
        ApiErrorResponseFactory.create('SERVICE_TYPE_NOT_FOUND', error.message),
      );
    }

    if (error instanceof ServiceRequestAddressNotFoundError) {
      throw new NotFoundException(
        ApiErrorResponseFactory.create('CUSTOMER_ADDRESS_NOT_FOUND', error.message),
      );
    }

    if (error instanceof ServiceRequestServiceTypeCategoryMismatchError) {
      throw new ConflictException(
        ApiErrorResponseFactory.create('SERVICE_TYPE_CATEGORY_MISMATCH', error.message),
      );
    }

    throw error;
  }

  private mapAssignTechnicianError(error: unknown): never {
    if (error instanceof AssignmentForbiddenError) {
      throw new ForbiddenException(
        ApiErrorResponseFactory.create('ASSIGNMENT_FORBIDDEN', error.message),
      );
    }

    if (error instanceof ServiceRequestNotFoundError || error instanceof TechnicianNotFoundError) {
      throw new NotFoundException(
        ApiErrorResponseFactory.create('ASSIGNMENT_RESOURCE_NOT_FOUND', error.message),
      );
    }

    if (error instanceof InvalidAssignmentTimeSlotError) {
      throw new BadRequestException(
        ApiErrorResponseFactory.create('ASSIGNMENT_TIME_SLOT_INVALID', error.message),
      );
    }

    if (
      error instanceof ServiceRequestCannotBeAssignedError ||
      error instanceof TechnicianNotActiveForAssignmentError ||
      error instanceof TechnicianMissingRequiredSkillsError ||
      error instanceof TechnicianOutsideServiceAreaError ||
      error instanceof TechnicianUnavailableForAssignmentError ||
      error instanceof TechnicianScheduleOverlapError
    ) {
      throw new ConflictException(
        ApiErrorResponseFactory.create('ASSIGNMENT_CONFLICT', error.message),
      );
    }

    throw error;
  }

  private mapReadServiceRequestError(error: unknown): never {
    if (error instanceof ServiceRequestNotFoundError) {
      throw new NotFoundException(
        ApiErrorResponseFactory.create('SERVICE_REQUEST_NOT_FOUND', error.message),
      );
    }

    if (error instanceof ServiceRequestReadForbiddenError) {
      throw new ForbiddenException(
        ApiErrorResponseFactory.create('SERVICE_REQUEST_READ_FORBIDDEN', error.message),
      );
    }

    throw error;
  }

  private mapTriageServiceRequestError(error: unknown): never {
    if (
      error instanceof ServiceRequestNotFoundError ||
      error instanceof ServiceRequestCategoryNotFoundError ||
      error instanceof ServiceRequestServiceTypeNotFoundError ||
      error instanceof ServiceRequestTriageSkillNotFoundError
    ) {
      throw new NotFoundException(
        ApiErrorResponseFactory.create('SERVICE_REQUEST_TRIAGE_RESOURCE_NOT_FOUND', error.message),
      );
    }

    if (error instanceof ServiceRequestTriageForbiddenError) {
      throw new ForbiddenException(
        ApiErrorResponseFactory.create('SERVICE_REQUEST_TRIAGE_FORBIDDEN', error.message),
      );
    }

    if (error instanceof ServiceRequestTriageDuplicateSkillsError) {
      throw new BadRequestException(
        ApiErrorResponseFactory.create('SERVICE_REQUEST_TRIAGE_VALIDATION_FAILED', error.message),
      );
    }

    if (
      error instanceof ServiceRequestServiceTypeCategoryMismatchError ||
      error instanceof ServiceRequestCannotBeTriagedError ||
      error instanceof ServiceRequestOtherTypeCannotBeTriagedError ||
      error instanceof ServiceRequestTriageConflictError
    ) {
      throw new ConflictException(
        ApiErrorResponseFactory.create('SERVICE_REQUEST_TRIAGE_CONFLICT', error.message),
      );
    }

    throw error;
  }
}
