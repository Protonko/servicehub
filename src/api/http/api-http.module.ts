import { Module } from '@nestjs/common';

import { ApplicationModule } from '@application/application.module';
import { InfraModule } from '@infra/infra.module';
import { AdminServiceCatalogController } from './admin-service-catalog.controller';
import { AdminTechniciansController } from './admin-technicians.controller';
import { AuthController } from './auth.controller';
import { CustomerAddressesController } from './customer-addresses.controller';
import { DispatcherController } from './dispatcher.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { HealthController } from './health.controller';
import { RolesGuard } from './guards/roles.guard';
import { ServiceAreasController } from './service-areas.controller';
import { ServiceCatalogController } from './service-catalog.controller';
import { ServiceRequestsController } from './service-requests.controller';
import { TechniciansController } from './technicians.controller';

@Module({
  imports: [ApplicationModule, InfraModule],
  controllers: [
    HealthController,
    AuthController,
    ServiceCatalogController,
    AdminServiceCatalogController,
    AdminTechniciansController,
    ServiceAreasController,
    CustomerAddressesController,
    DispatcherController,
    ServiceRequestsController,
    TechniciansController,
  ],
  providers: [JwtAuthGuard, RolesGuard],
})
export class ApiHttpModule {}
