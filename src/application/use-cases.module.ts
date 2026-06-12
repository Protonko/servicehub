import { Module } from '@nestjs/common';

import { InfraModule } from '@infra/infra.module';
import {
  GetCurrentUserUseCase,
  LoginUseCase,
  RefreshSessionUseCase,
  RegisterCustomerUseCase,
} from '@application/use-cases';

const useCases = [
  RegisterCustomerUseCase,
  LoginUseCase,
  RefreshSessionUseCase,
  GetCurrentUserUseCase,
];

@Module({
  imports: [InfraModule],
  providers: useCases,
  exports: useCases,
})
export class UseCasesModule {}
