import { Controller, Get, UseGuards } from '@nestjs/common';

import { ListServiceAreasUseCase } from '@application/use-cases';
import { RoleCode } from '@domain/model';
import { Roles } from './decorators/roles.decorator';
import { toServiceAreaListResponse } from './dto/service-area.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Controller('service-areas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceAreasController {
  constructor(private readonly listServiceAreasUseCase: ListServiceAreasUseCase) {}

  @Get()
  @Roles(RoleCode.Customer, RoleCode.Dispatcher, RoleCode.Technician, RoleCode.Admin)
  async listServiceAreas() {
    const result = await this.listServiceAreasUseCase.execute();

    return toServiceAreaListResponse(result.serviceAreas);
  }
}
