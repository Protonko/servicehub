import { Module } from '@nestjs/common';

import { ApplicationModule } from '@application/application.module';
import { InfraModule } from '@infra/infra.module';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { HealthController } from './health.controller';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [ApplicationModule, InfraModule],
  controllers: [HealthController, AuthController],
  providers: [JwtAuthGuard, RolesGuard],
})
export class ApiHttpModule {}
