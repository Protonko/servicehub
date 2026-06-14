import { Module } from '@nestjs/common';

import { ApplicationModule } from '@application/application.module';
import { InfraModule } from '@infra/infra.module';
import { AdminServiceCatalogController } from './admin-service-catalog.controller';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { HealthController } from './health.controller';
import { RolesGuard } from './guards/roles.guard';
import { ServiceCatalogController } from './service-catalog.controller';

@Module({
  imports: [ApplicationModule, InfraModule],
  controllers: [
    HealthController,
    AuthController,
    ServiceCatalogController,
    AdminServiceCatalogController,
  ],
  providers: [JwtAuthGuard, RolesGuard],
})
export class ApiHttpModule {}
