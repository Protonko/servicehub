import { Module } from '@nestjs/common';

import { InfraModule } from '@infra/infra.module';
import {
  CreateServiceCategoryUseCase,
  CreateCustomerAddressUseCase,
  CreateServiceRequestUseCase,
  CreateServiceTypeUseCase,
  CreateTechnicianUseCase,
  GetCurrentUserUseCase,
  GetDispatcherQueueUseCase,
  GetServiceRequestUseCase,
  ListCustomerAddressesUseCase,
  ListServiceCategoriesUseCase,
  ListServiceAreasUseCase,
  ListServiceTypesUseCase,
  ListTechniciansUseCase,
  LoginUseCase,
  RefreshSessionUseCase,
  RegisterCustomerUseCase,
  SearchServiceRequestsUseCase,
  TriageServiceRequestUseCase,
  UpdateServiceCategoryUseCase,
  UpdateCustomerAddressUseCase,
  UpdateServiceTypeUseCase,
  UpdateTechnicianUseCase,
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
  CreateTechnicianUseCase,
  UpdateTechnicianUseCase,
  ListTechniciansUseCase,
  CreateServiceRequestUseCase,
  SearchServiceRequestsUseCase,
  GetServiceRequestUseCase,
  TriageServiceRequestUseCase,
];

@Module({
  imports: [InfraModule],
  providers: useCases,
  exports: useCases,
})
export class UseCasesModule {}
