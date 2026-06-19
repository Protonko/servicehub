import { Inject, Injectable } from '@nestjs/common';

import {
  ServiceRequestAddressNotFoundError,
  ServiceRequestCategoryNotFoundError,
  ServiceRequestPreferredWindowInPastError,
  ServiceRequestServiceTypeCategoryMismatchError,
  ServiceRequestServiceTypeNotFoundError,
} from '@application/errors';
import { ServiceRequest } from '@domain/model';
import {
  CUSTOMER_ADDRESS_REPOSITORY,
  CustomerAddressRepository,
  SERVICE_CATALOG_ADMIN_REPOSITORY,
  SERVICE_REQUEST_REPOSITORY,
  ServiceCatalogAdminRepository,
  ServiceRequestRepository,
  CreatedServiceRequest,
} from '@domain/repositories';
import { SlaDeadlineCalculator } from '@domain/services/sla-deadline-calculator';

export interface CreateServiceRequestAttachmentCommand {
  fileName: string;
  mimeType: string;
  storageKey: string;
}

export interface CreateServiceRequestCommand {
  customerId: string;
  categoryId: string;
  serviceTypeId: string;
  addressId: string;
  description: string;
  additionalContactInstructions?: string | null;
  preferredStartAt: Date;
  preferredEndAt: Date;
  attachments?: CreateServiceRequestAttachmentCommand[];
}

export interface CreateServiceRequestResult {
  created: CreatedServiceRequest;
}

@Injectable()
export class CreateServiceRequestUseCase {
  constructor(
    @Inject(SERVICE_CATALOG_ADMIN_REPOSITORY)
    private readonly serviceCatalogRepository: ServiceCatalogAdminRepository,
    @Inject(CUSTOMER_ADDRESS_REPOSITORY)
    private readonly customerAddressRepository: CustomerAddressRepository,
    @Inject(SERVICE_REQUEST_REPOSITORY)
    private readonly serviceRequestRepository: ServiceRequestRepository,
  ) {}

  async execute(command: CreateServiceRequestCommand): Promise<CreateServiceRequestResult> {
    const now = new Date();
    const preferredStartAt = new Date(command.preferredStartAt);
    const preferredEndAt = new Date(command.preferredEndAt);

    if (preferredStartAt <= now || preferredEndAt <= now) {
      throw new ServiceRequestPreferredWindowInPastError();
    }

    const [categoryExists, catalogSnapshot, customerAddress] = await Promise.all([
      this.serviceCatalogRepository.activeCategoryExists(command.categoryId),
      this.serviceCatalogRepository.findActiveServiceTypeForRequest(command.serviceTypeId),
      this.customerAddressRepository.findByIdForCustomer(command.addressId, command.customerId),
    ]);

    if (!categoryExists) {
      throw new ServiceRequestCategoryNotFoundError();
    }

    if (!catalogSnapshot) {
      throw new ServiceRequestServiceTypeNotFoundError();
    }

    if (catalogSnapshot.serviceType.categoryId !== command.categoryId) {
      throw new ServiceRequestServiceTypeCategoryMismatchError();
    }

    if (!customerAddress) {
      throw new ServiceRequestAddressNotFoundError();
    }

    const deadlines = SlaDeadlineCalculator.calculate({
      startAt: now,
      assignmentDeadlineMinutes: catalogSnapshot.slaPolicy.assignmentDeadlineMinutes,
      completionDeadlineMinutes: catalogSnapshot.slaPolicy.completionDeadlineMinutes,
    });

    const request = ServiceRequest.create({
      customerId: command.customerId,
      categoryId: command.categoryId,
      serviceTypeId: catalogSnapshot.serviceType.id,
      addressId: command.addressId,
      slaPolicyId: catalogSnapshot.serviceType.slaPolicyId,
      priority: catalogSnapshot.serviceType.defaultPriority,
      description: command.description,
      additionalContactInstructions: command.additionalContactInstructions,
      preferredStartAt,
      preferredEndAt,
      estimatedDurationMinutes: catalogSnapshot.serviceType.estimatedDurationMinutes,
      assignmentDeadlineAt: deadlines.assignmentDeadlineAt,
      completionDeadlineAt: deadlines.completionDeadlineAt,
      isOtherServiceType: catalogSnapshot.serviceType.isOther,
    });

    const created = await this.serviceRequestRepository.create({
      request,
      requiredSkillIds: catalogSnapshot.serviceType.requiredSkillIds,
      attachments: command.attachments ?? [],
      actorUserId: command.customerId,
    });

    return { created };
  }
}
