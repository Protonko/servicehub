import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  CreateServiceCategoryUseCase,
  CreateServiceTypeUseCase,
  UpdateServiceCategoryUseCase,
  UpdateServiceTypeUseCase,
} from '@application/use-cases';
import {
  DuplicateServiceCategoryCodeError,
  DuplicateServiceTypeCodeError,
  EmptyServiceCatalogUpdateError,
  ServiceCategoryNotFoundError,
  ServiceTypeNotFoundError,
  ServiceTypeOtherAlreadyExistsError,
  SkillNotFoundError,
  SlaPolicyNotFoundError,
} from '@application/errors';
import { RoleCode } from '@domain/model';
import { Roles } from './decorators/roles.decorator';
import {
  CreateServiceCategoryRequestDto,
  CreateServiceTypeRequestDto,
  UpdateServiceCategoryRequestDto,
  UpdateServiceTypeRequestDto,
  toServiceCategoryAdminResponse,
  toServiceTypeAdminResponse,
} from './dto/service-catalog-admin.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Controller('admin/service-catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.Admin)
export class AdminServiceCatalogController {
  constructor(
    private readonly createServiceCategoryUseCase: CreateServiceCategoryUseCase,
    private readonly updateServiceCategoryUseCase: UpdateServiceCategoryUseCase,
    private readonly createServiceTypeUseCase: CreateServiceTypeUseCase,
    private readonly updateServiceTypeUseCase: UpdateServiceTypeUseCase,
  ) {}

  @Post('categories')
  async createCategory(@Body() dto: CreateServiceCategoryRequestDto) {
    try {
      const result = await this.createServiceCategoryUseCase.execute(dto);

      return toServiceCategoryAdminResponse(result.category);
    } catch (error) {
      this.mapServiceCatalogAdminError(error);
    }
  }

  @Patch('categories/:categoryId')
  async updateCategory(
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
    @Body() dto: UpdateServiceCategoryRequestDto,
  ) {
    try {
      const result = await this.updateServiceCategoryUseCase.execute({
        categoryId,
        ...dto,
      });

      return toServiceCategoryAdminResponse(result.category);
    } catch (error) {
      this.mapServiceCatalogAdminError(error);
    }
  }

  @Post('service-types')
  async createServiceType(@Body() dto: CreateServiceTypeRequestDto) {
    try {
      const result = await this.createServiceTypeUseCase.execute(dto);

      return toServiceTypeAdminResponse(result.serviceType);
    } catch (error) {
      this.mapServiceCatalogAdminError(error);
    }
  }

  @Patch('service-types/:serviceTypeId')
  async updateServiceType(
    @Param('serviceTypeId', new ParseUUIDPipe()) serviceTypeId: string,
    @Body() dto: UpdateServiceTypeRequestDto,
  ) {
    try {
      const result = await this.updateServiceTypeUseCase.execute({
        serviceTypeId,
        ...dto,
      });

      return toServiceTypeAdminResponse(result.serviceType);
    } catch (error) {
      this.mapServiceCatalogAdminError(error);
    }
  }

  private mapServiceCatalogAdminError(error: unknown): never {
    if (error instanceof EmptyServiceCatalogUpdateError) {
      throw new BadRequestException(this.createErrorResponse('EMPTY_UPDATE', error.message));
    }

    if (error instanceof DuplicateServiceCategoryCodeError) {
      throw new ConflictException(
        this.createErrorResponse('SERVICE_CATEGORY_CODE_ALREADY_EXISTS', error.message),
      );
    }

    if (error instanceof DuplicateServiceTypeCodeError) {
      throw new ConflictException(
        this.createErrorResponse('SERVICE_TYPE_CODE_ALREADY_EXISTS', error.message),
      );
    }

    if (error instanceof ServiceTypeOtherAlreadyExistsError) {
      throw new ConflictException(
        this.createErrorResponse('SERVICE_TYPE_OTHER_ALREADY_EXISTS', error.message),
      );
    }

    if (error instanceof ServiceCategoryNotFoundError) {
      throw new NotFoundException(
        this.createErrorResponse('SERVICE_CATEGORY_NOT_FOUND', error.message),
      );
    }

    if (error instanceof ServiceTypeNotFoundError) {
      throw new NotFoundException(
        this.createErrorResponse('SERVICE_TYPE_NOT_FOUND', error.message),
      );
    }

    if (error instanceof SlaPolicyNotFoundError) {
      throw new NotFoundException(this.createErrorResponse('SLA_POLICY_NOT_FOUND', error.message));
    }

    if (error instanceof SkillNotFoundError) {
      throw new NotFoundException(this.createErrorResponse('SKILL_NOT_FOUND', error.message));
    }

    throw error;
  }

  private createErrorResponse(code: string, message: string) {
    return {
      error: {
        code,
        message,
        details: {},
      },
    };
  }
}
