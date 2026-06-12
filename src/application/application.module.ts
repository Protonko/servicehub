import { Module } from '@nestjs/common';

import { DomainModule } from '@domain/domain.module';
import { InfraModule } from '@infra/infra.module';

import { UseCasesModule } from './use-cases.module';

@Module({
  imports: [DomainModule, InfraModule, UseCasesModule],
  exports: [UseCasesModule],
})
export class ApplicationModule {}
