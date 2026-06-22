import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

import { DispatcherQueueItem, DispatcherQueueSlaState } from '@application/read-models';
import { RequestPriority, ServiceRequestStatus } from '@domain/model';

const toQueryNumber = (value: unknown): number => (value === '' ? Number.NaN : Number(value));

export class GetDispatcherQueueQueryDto {
  @IsOptional()
  @IsEnum(ServiceRequestStatus)
  status?: ServiceRequestStatus;

  @IsOptional()
  @IsEnum(RequestPriority)
  priority?: RequestPriority;

  @IsOptional()
  @IsUUID()
  serviceAreaId?: string;

  @IsOptional()
  @IsEnum(DispatcherQueueSlaState)
  slaState?: DispatcherQueueSlaState;

  @Transform(({ value }) => toQueryNumber(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @Transform(({ value }) => toQueryNumber(value))
  @IsInt()
  @Min(0)
  offset = 0;
}

export interface DispatcherQueueItemResponseDto {
  id: string;
  customer: { id: string; fullName: string };
  category: { id: string; code: string; name: string };
  serviceType: { id: string; code: string; name: string; isOther: boolean };
  address: { id: string; city: string; line1: string };
  serviceArea: { id: string; code: string; name: string };
  status: ServiceRequestStatus;
  priority: RequestPriority;
  slaState: DispatcherQueueSlaState;
  relevantDeadlineAt: string;
  preferredStartAt: string;
  preferredEndAt: string;
  assignmentDeadlineAt: string;
  completionDeadlineAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DispatcherQueueResponseDto {
  data: DispatcherQueueItemResponseDto[];
  meta: { limit: number; offset: number; total: number };
}

export const toDispatcherQueueResponse = (
  requests: DispatcherQueueItem[],
  pagination: { limit: number; offset: number; total: number },
): DispatcherQueueResponseDto => ({
  data: requests.map((request) => ({
    ...request,
    relevantDeadlineAt: request.relevantDeadlineAt.toISOString(),
    preferredStartAt: request.preferredStartAt.toISOString(),
    preferredEndAt: request.preferredEndAt.toISOString(),
    assignmentDeadlineAt: request.assignmentDeadlineAt.toISOString(),
    completionDeadlineAt: request.completionDeadlineAt.toISOString(),
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  })),
  meta: pagination,
});
