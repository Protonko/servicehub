import { Inject, Injectable } from '@nestjs/common';

import {
  InvalidTechnicianEligibilityWindowError,
  ServiceRequestNotAssignableForEligibilityError,
  ServiceRequestNotFoundError,
} from '@application/errors';
import {
  TECHNICIAN_ELIGIBILITY_QUERY,
  TechnicianEligibilityQuery,
} from '@application/queries/technician-eligibility.query';
import { EligibleTechnicianSearchResult } from '@application/read-models';
import { SERVICE_REQUEST_REPOSITORY, ServiceRequestRepository } from '@domain/repositories';

export interface GetEligibleTechniciansInput {
  requestId: string;
  startsAt: Date;
  endsAt: Date;
}

@Injectable()
export class GetEligibleTechniciansUseCase {
  constructor(
    @Inject(SERVICE_REQUEST_REPOSITORY)
    private readonly serviceRequestRepository: ServiceRequestRepository,
    @Inject(TECHNICIAN_ELIGIBILITY_QUERY)
    private readonly technicianEligibilityQuery: TechnicianEligibilityQuery,
  ) {}

  async execute(input: GetEligibleTechniciansInput): Promise<EligibleTechnicianSearchResult> {
    if (
      Number.isNaN(input.startsAt.getTime()) ||
      Number.isNaN(input.endsAt.getTime()) ||
      input.startsAt.getTime() >= input.endsAt.getTime()
    ) {
      throw new InvalidTechnicianEligibilityWindowError();
    }

    const request = await this.serviceRequestRepository.findById(input.requestId);

    if (!request) {
      throw new ServiceRequestNotFoundError();
    }

    if (!request.canBeAssigned()) {
      throw new ServiceRequestNotAssignableForEligibilityError();
    }

    return {
      requestId: request.id,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      candidates: await this.technicianEligibilityQuery.findEligibleTechnicians(
        request.id,
        input.startsAt,
        input.endsAt,
      ),
    };
  }
}
