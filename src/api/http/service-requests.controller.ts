import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthenticatedActor } from '@application/auth';
import {
  ServiceRequestAddressNotFoundError,
  ServiceRequestCategoryNotFoundError,
  ServiceRequestPreferredWindowInPastError,
  ServiceRequestServiceTypeCategoryMismatchError,
  ServiceRequestServiceTypeNotFoundError,
} from '@application/errors';
import { CreateServiceRequestUseCase } from '@application/use-cases';
import { RoleCode } from '@domain/model';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import {
  CreateServiceRequestRequestDto,
  toServiceRequestResponse,
} from './dto/service-request.dto';
import { ApiErrorResponseFactory } from './factories/api-error-response.factory';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Controller('service-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.Customer)
export class ServiceRequestsController {
  constructor(private readonly createServiceRequestUseCase: CreateServiceRequestUseCase) {}

  @Post()
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
}
