import { Module } from '@nestjs/common';

import { InfraModule } from '@infra/infra.module';
import {
  CreateServiceCategoryUseCase,
  CreateCustomerAddressUseCase,
  CreateServiceRequestUseCase,
  CreateServiceTypeUseCase,
  GetCurrentUserUseCase,
  ListCustomerAddressesUseCase,
  ListServiceCategoriesUseCase,
  ListServiceAreasUseCase,
  ListServiceTypesUseCase,
  LoginUseCase,
  RefreshSessionUseCase,
  RegisterCustomerUseCase,
  UpdateServiceCategoryUseCase,
  UpdateCustomerAddressUseCase,
  UpdateServiceTypeUseCase,
} from '@application/use-cases';

const useCases = [
  RegisterCustomerUseCase,
  LoginUseCase,
  RefreshSessionUseCase,
  GetCurrentUserUseCase,
  ListServiceCategoriesUseCase,
  ListServiceTypesUseCase,
  ListServiceAreasUseCase,
  CreateCustomerAddressUseCase,
  ListCustomerAddressesUseCase,
  UpdateCustomerAddressUseCase,
  CreateServiceCategoryUseCase,
  UpdateServiceCategoryUseCase,
  CreateServiceTypeUseCase,
  UpdateServiceTypeUseCase,
  CreateServiceRequestUseCase,
];

@Module({
  imports: [InfraModule],
  providers: useCases,
  exports: useCases,
})
export class UseCasesModule {}
