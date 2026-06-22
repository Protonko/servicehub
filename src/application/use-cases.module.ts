import { Module } from '@nestjs/common';

import { InfraModule } from '@infra/infra.module';
import {
  CreateServiceCategoryUseCase,
  CreateCustomerAddressUseCase,
  CreateServiceRequestUseCase,
  CreateServiceTypeUseCase,
  GetCurrentUserUseCase,
  GetDispatcherQueueUseCase,
  GetServiceRequestUseCase,
  ListCustomerAddressesUseCase,
  ListServiceCategoriesUseCase,
  ListServiceAreasUseCase,
  ListServiceTypesUseCase,
  LoginUseCase,
  RefreshSessionUseCase,
  RegisterCustomerUseCase,
  SearchServiceRequestsUseCase,
  UpdateServiceCategoryUseCase,
  UpdateCustomerAddressUseCase,
  UpdateServiceTypeUseCase,
} from '@application/use-cases';

const useCases = [
  RegisterCustomerUseCase,
  LoginUseCase,
  RefreshSessionUseCase,
  GetCurrentUserUseCase,
  GetDispatcherQueueUseCase,
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
  SearchServiceRequestsUseCase,
  GetServiceRequestUseCase,
];

@Module({
  imports: [InfraModule],
  providers: useCases,
  exports: useCases,
})
export class UseCasesModule {}
