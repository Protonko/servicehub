import { Module } from '@nestjs/common';

import { ApplicationModule } from './application/application.module';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './db/database.module';
import { DomainModule } from './domain/domain.module';
import { InfraModule } from './infra/infra.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, DomainModule, InfraModule, ApplicationModule],
})
export class WorkerModule {}
