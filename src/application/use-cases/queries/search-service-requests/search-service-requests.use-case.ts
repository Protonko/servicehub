import { Inject, Injectable } from '@nestjs/common';

import { AuthenticatedActor, resolveServiceRequestReadScope } from '@application/auth';
import {
  SERVICE_REQUEST_READ_QUERY,
  ServiceRequestPagination,
  ServiceRequestReadQuery,
  ServiceRequestSearchCriteria,
} from '@application/queries/service-request-read.query';
import { ServiceRequestSummary } from '@application/read-models';

export interface SearchServiceRequestsInput {
  actor: AuthenticatedActor;
  criteria: ServiceRequestSearchCriteria;
  pagination: ServiceRequestPagination;
}

export interface SearchServiceRequestsResult {
  requests: ServiceRequestSummary[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class SearchServiceRequestsUseCase {
  constructor(
    @Inject(SERVICE_REQUEST_READ_QUERY)
    private readonly serviceRequestReadQuery: ServiceRequestReadQuery,
  ) {}

  async execute(input: SearchServiceRequestsInput): Promise<SearchServiceRequestsResult> {
    const scope = resolveServiceRequestReadScope(input.actor);
    const result = await this.serviceRequestReadQuery.search(
      input.criteria,
      scope,
      input.pagination,
    );

    return {
      requests: result.items,
      total: result.total,
      limit: input.pagination.limit,
      offset: input.pagination.offset,
    };
  }
}
