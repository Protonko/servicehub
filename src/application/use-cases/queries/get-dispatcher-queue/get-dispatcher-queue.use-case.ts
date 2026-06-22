import { Inject, Injectable } from '@nestjs/common';

import { AuthenticatedActor } from '@application/auth';
import { DispatcherQueueForbiddenError } from '@application/errors';
import {
  DISPATCHER_QUEUE_READ_QUERY,
  DispatcherQueueCriteria,
  DispatcherQueuePagination,
  DispatcherQueueReadQuery,
} from '@application/queries/dispatcher-queue-read.query';
import { DispatcherQueueItem } from '@application/read-models';
import { RoleCode } from '@domain/model';

export interface GetDispatcherQueueInput {
  actor: AuthenticatedActor;
  criteria: DispatcherQueueCriteria;
  pagination: DispatcherQueuePagination;
}

export interface GetDispatcherQueueResult {
  requests: DispatcherQueueItem[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class GetDispatcherQueueUseCase {
  constructor(
    @Inject(DISPATCHER_QUEUE_READ_QUERY)
    private readonly dispatcherQueueReadQuery: DispatcherQueueReadQuery,
  ) {}

  async execute(input: GetDispatcherQueueInput): Promise<GetDispatcherQueueResult> {
    if (
      !input.actor.roles.some((role) => role === RoleCode.Dispatcher || role === RoleCode.Admin)
    ) {
      throw new DispatcherQueueForbiddenError();
    }

    const result = await this.dispatcherQueueReadQuery.search(input.criteria, input.pagination);

    return {
      requests: result.items,
      total: result.total,
      limit: input.pagination.limit,
      offset: input.pagination.offset,
    };
  }
}
