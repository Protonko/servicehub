import { Module } from '@nestjs/common';

import { InfraModule } from '@infra/infra.module';
import {
  GetCurrentUserUseCase,
  ListServiceCategoriesUseCase,
  ListServiceTypesUseCase,
  LoginUseCase,
  RefreshSessionUseCase,
  RegisterCustomerUseCase,
} from '@application/use-cases';

const useCases = [
  RegisterCustomerUseCase,
  LoginUseCase,
  RefreshSessionUseCase,
  GetCurrentUserUseCase,
  ListServiceCategoriesUseCase,
  ListServiceTypesUseCase,
];

@Module({
  imports: [InfraModule],
  providers: useCases,
  exports: useCases,
})
export class UseCasesModule {}
