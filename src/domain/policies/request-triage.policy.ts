import { ServiceRequestOtherTypeCannotBeTriagedError } from '@domain/exceptions';
import { ServiceRequest, TriageServiceRequestInput } from '@domain/model';

export interface RequestTriagePolicyInput extends TriageServiceRequestInput {
  isOtherServiceType: boolean;
}

export class RequestTriagePolicy {
  static triage(request: ServiceRequest, input: RequestTriagePolicyInput): ServiceRequest {
    if (input.isOtherServiceType) {
      throw new ServiceRequestOtherTypeCannotBeTriagedError();
    }

    return request.triage({
      categoryId: input.categoryId,
      serviceTypeId: input.serviceTypeId,
      slaPolicyId: input.slaPolicyId,
      priority: input.priority,
      estimatedDurationMinutes: input.estimatedDurationMinutes,
      assignmentDeadlineAt: input.assignmentDeadlineAt,
      completionDeadlineAt: input.completionDeadlineAt,
      triagedAt: input.triagedAt,
    });
  }
}
