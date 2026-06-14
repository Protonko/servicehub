import { Module } from '@nestjs/common';

import { InfraModule } from '@infra/infra.module';
import {
  CreateServiceCategoryUseCase,
  CreateServiceTypeUseCase,
  GetCurrentUserUseCase,
  ListServiceCategoriesUseCase,
  ListServiceTypesUseCase,
  LoginUseCase,
  RefreshSessionUseCase,
  RegisterCustomerUseCase,
  UpdateServiceCategoryUseCase,
  UpdateServiceTypeUseCase,
} from '@application/use-cases';

const useCases = [
  RegisterCustomerUseCase,
  LoginUseCase,
  RefreshSessionUseCase,
  GetCurrentUserUseCase,
  ListServiceCategoriesUseCase,
  ListServiceTypesUseCase,
  CreateServiceCategoryUseCase,
  UpdateServiceCategoryUseCase,
  CreateServiceTypeUseCase,
  UpdateServiceTypeUseCase,
];

@Module({
  imports: [InfraModule],
  providers: useCases,
  exports: useCases,
})
export class UseCasesModule {}
