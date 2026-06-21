import { Inject, Injectable } from '@nestjs/common';

import { AuthenticatedActor, resolveServiceRequestReadScope } from '@application/auth';
import { ServiceRequestNotFoundError } from '@application/errors';
import {
  SERVICE_REQUEST_READ_QUERY,
  ServiceRequestReadQuery,
} from '@application/queries/service-request-read.query';
import { ServiceRequestDetail } from '@application/read-models';

export interface GetServiceRequestInput {
  actor: AuthenticatedActor;
  requestId: string;
}

export interface GetServiceRequestResult {
  request: ServiceRequestDetail;
}

@Injectable()
export class GetServiceRequestUseCase {
  constructor(
    @Inject(SERVICE_REQUEST_READ_QUERY)
    private readonly serviceRequestReadQuery: ServiceRequestReadQuery,
  ) {}

  async execute(input: GetServiceRequestInput): Promise<GetServiceRequestResult> {
    const scope = resolveServiceRequestReadScope(input.actor);
    const request = await this.serviceRequestReadQuery.findById(input.requestId, scope);

    if (!request) {
      throw new ServiceRequestNotFoundError();
    }

    return { request };
  }
}
