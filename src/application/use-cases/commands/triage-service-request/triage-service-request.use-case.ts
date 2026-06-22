import { Inject, Injectable } from '@nestjs/common';

import { AuthenticatedActor } from '@application/auth';
import {
  ServiceRequestCategoryNotFoundError,
  ServiceRequestNotFoundError,
  ServiceRequestServiceTypeCategoryMismatchError,
  ServiceRequestServiceTypeNotFoundError,
  ServiceRequestTriageDuplicateSkillsError,
  ServiceRequestTriageForbiddenError,
  ServiceRequestTriageSkillNotFoundError,
} from '@application/errors';
import { RequestPriority, RoleCode } from '@domain/model';
import { RequestTriagePolicy } from '@domain/policies/request-triage.policy';
import {
  SERVICE_CATALOG_ADMIN_REPOSITORY,
  SERVICE_REQUEST_REPOSITORY,
  ServiceCatalogAdminRepository,
  ServiceRequestRepository,
  TriagedServiceRequest,
} from '@domain/repositories';
import { SlaDeadlineCalculator } from '@domain/services/sla-deadline-calculator';

export interface TriageServiceRequestCommand {
  actor: AuthenticatedActor;
  requestId: string;
  categoryId: string;
  serviceTypeId: string;
  priority: RequestPriority;
  estimatedDurationMinutes: number;
  requiredSkillIds: string[];
}

export interface TriageServiceRequestResult {
  triaged: TriagedServiceRequest;
}

@Injectable()
export class TriageServiceRequestUseCase {
  constructor(
    @Inject(SERVICE_CATALOG_ADMIN_REPOSITORY)
    private readonly serviceCatalogRepository: ServiceCatalogAdminRepository,
    @Inject(SERVICE_REQUEST_REPOSITORY)
    private readonly serviceRequestRepository: ServiceRequestRepository,
  ) {}

  async execute(command: TriageServiceRequestCommand): Promise<TriageServiceRequestResult> {
    if (
      !command.actor.roles.some((role) => role === RoleCode.Dispatcher || role === RoleCode.Admin)
    ) {
      throw new ServiceRequestTriageForbiddenError();
    }

    if (new Set(command.requiredSkillIds).size !== command.requiredSkillIds.length) {
      throw new ServiceRequestTriageDuplicateSkillsError();
    }

    const [request, categoryExists, catalogSnapshot, activeSkillIds] = await Promise.all([
      this.serviceRequestRepository.findById(command.requestId),
      this.serviceCatalogRepository.activeCategoryExists(command.categoryId),
      this.serviceCatalogRepository.findActiveServiceTypeForRequest(command.serviceTypeId),
      this.serviceCatalogRepository.findActiveSkillIds(command.requiredSkillIds),
    ]);

    if (!request) {
      throw new ServiceRequestNotFoundError();
    }

    if (!categoryExists) {
      throw new ServiceRequestCategoryNotFoundError();
    }

    if (!catalogSnapshot) {
      throw new ServiceRequestServiceTypeNotFoundError();
    }

    if (catalogSnapshot.serviceType.categoryId !== command.categoryId) {
      throw new ServiceRequestServiceTypeCategoryMismatchError();
    }

    if (activeSkillIds.length !== command.requiredSkillIds.length) {
      throw new ServiceRequestTriageSkillNotFoundError();
    }

    if (!request.createdAt) {
      throw new ServiceRequestNotFoundError();
    }

    const deadlines = SlaDeadlineCalculator.calculate({
      startAt: request.createdAt,
      assignmentDeadlineMinutes: catalogSnapshot.slaPolicy.assignmentDeadlineMinutes,
      completionDeadlineMinutes: catalogSnapshot.slaPolicy.completionDeadlineMinutes,
    });
    const expectedStatus = request.status;
    const triagedRequest = RequestTriagePolicy.triage(request, {
      categoryId: command.categoryId,
      serviceTypeId: command.serviceTypeId,
      slaPolicyId: catalogSnapshot.slaPolicy.id,
      priority: command.priority,
      estimatedDurationMinutes: command.estimatedDurationMinutes,
      assignmentDeadlineAt: deadlines.assignmentDeadlineAt,
      completionDeadlineAt: deadlines.completionDeadlineAt,
      isOtherServiceType: catalogSnapshot.serviceType.isOther,
    });

    const triaged = await this.serviceRequestRepository.triage({
      request: triagedRequest,
      expectedStatus,
      requiredSkillIds: command.requiredSkillIds,
      actorUserId: command.actor.userId,
    });

    return { triaged };
  }
}
