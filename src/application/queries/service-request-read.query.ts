import { ServiceRequestReadScope } from '@application/auth';
import { ServiceRequestDetail, ServiceRequestSummary } from '@application/read-models';
import { RequestPriority, ServiceRequestStatus } from '@domain/model';

export const SERVICE_REQUEST_READ_QUERY = Symbol('SERVICE_REQUEST_READ_QUERY');

export interface ServiceRequestSearchCriteria {
  status?: ServiceRequestStatus;
  priority?: RequestPriority;
  categoryId?: string;
  serviceTypeId?: string;
  createdFrom?: Date;
  createdTo?: Date;
}

export interface ServiceRequestPagination {
  limit: number;
  offset: number;
}

export interface ServiceRequestSearchResult {
  items: ServiceRequestSummary[];
  total: number;
}

export interface ServiceRequestReadQuery {
  search(
    criteria: ServiceRequestSearchCriteria,
    scope: ServiceRequestReadScope,
    pagination: ServiceRequestPagination,
  ): Promise<ServiceRequestSearchResult>;
  findById(
    requestId: string,
    scope: ServiceRequestReadScope,
  ): Promise<ServiceRequestDetail | null>;
}
