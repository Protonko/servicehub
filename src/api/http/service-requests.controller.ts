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
} from '@application/errors';
import {
  CreateServiceRequestUseCase,
  GetServiceRequestUseCase,
  SearchServiceRequestsUseCase,
  TriageServiceRequestUseCase,
} from '@application/use-cases';
import {
  ServiceRequestCannotBeTriagedError,
  ServiceRequestOtherTypeCannotBeTriagedError,
  ServiceRequestTriageConflictError,
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
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Controller('service-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceRequestsController {
  constructor(
    private readonly createServiceRequestUseCase: CreateServiceRequestUseCase,
    private readonly searchServiceRequestsUseCase: SearchServiceRequestsUseCase,
    private readonly getServiceRequestUseCase: GetServiceRequestUseCase,
    private readonly triageServiceRequestUseCase: TriageServiceRequestUseCase,
  ) {}

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
