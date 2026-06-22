import { DispatcherQueueItem, DispatcherQueueSlaState } from '@application/read-models';
import { RequestPriority, ServiceRequestStatus } from '@domain/model';

export const DISPATCHER_QUEUE_READ_QUERY = Symbol('DISPATCHER_QUEUE_READ_QUERY');

export interface DispatcherQueueCriteria {
  status?: ServiceRequestStatus;
  priority?: RequestPriority;
  serviceAreaId?: string;
  slaState?: DispatcherQueueSlaState;
}

export interface DispatcherQueuePagination {
  limit: number;
  offset: number;
}

export interface DispatcherQueueSearchResult {
  items: DispatcherQueueItem[];
  total: number;
}

export interface DispatcherQueueReadQuery {
  search(
    criteria: DispatcherQueueCriteria,
    pagination: DispatcherQueuePagination,
  ): Promise<DispatcherQueueSearchResult>;
}
