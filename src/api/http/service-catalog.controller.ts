import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';

import { ServiceCategoryNotFoundError } from '@application/errors';
import { ListServiceCategoriesUseCase, ListServiceTypesUseCase } from '@application/use-cases';
import { RoleCode } from '@domain/model';
import { Roles } from './decorators/roles.decorator';
import {
  toServiceCategoryListResponse,
  toServiceTypeListResponse,
} from './dto/service-catalog.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Controller('service-catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceCatalogController {
  constructor(
    private readonly listServiceCategoriesUseCase: ListServiceCategoriesUseCase,
    private readonly listServiceTypesUseCase: ListServiceTypesUseCase,
  ) {}

  @Get('categories')
  @Roles(RoleCode.Customer, RoleCode.Dispatcher, RoleCode.Technician, RoleCode.Admin)
  async listCategories() {
    const result = await this.listServiceCategoriesUseCase.execute();

    return toServiceCategoryListResponse(result.categories);
  }

  @Get('categories/:categoryId/service-types')
  @Roles(RoleCode.Customer, RoleCode.Dispatcher, RoleCode.Admin)
  async listServiceTypes(@Param('categoryId', new ParseUUIDPipe()) categoryId: string) {
    try {
      const result = await this.listServiceTypesUseCase.execute({ categoryId });

      return toServiceTypeListResponse(result.serviceTypes);
    } catch (error) {
      if (error instanceof ServiceCategoryNotFoundError) {
        throw new NotFoundException({
          error: {
            code: 'SERVICE_CATEGORY_NOT_FOUND',
            message: error.message,
            details: {},
          },
        });
      }

      throw error;
    }
  }
}
