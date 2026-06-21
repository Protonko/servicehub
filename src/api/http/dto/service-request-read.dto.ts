import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

import { ServiceRequestDetail, ServiceRequestSummary } from '@application/read-models';
import { RequestPriority, ServiceRequestStatus } from '@domain/model';

@ValidatorConstraint({ name: 'createdDateRange' })
class CreatedDateRangeConstraint implements ValidatorConstraintInterface {
  validate(createdTo: unknown, arguments_: ValidationArguments): boolean {
    const query = arguments_.object as SearchServiceRequestsQueryDto;

    if (!query.createdFrom || typeof createdTo !== 'string') {
      return true;
    }

    const fromTime = new Date(query.createdFrom).getTime();
    const toTime = new Date(createdTo).getTime();

    return Number.isFinite(fromTime) && Number.isFinite(toTime) && fromTime <= toTime;
  }

  defaultMessage(): string {
    return 'createdFrom must be less than or equal to createdTo';
  }
}

const toQueryNumber = (value: unknown): number => {
  if (value === '') {
    return Number.NaN;
  }

  return Number(value);
};

export class SearchServiceRequestsQueryDto {
  @IsOptional()
  @IsEnum(ServiceRequestStatus)
  status?: ServiceRequestStatus;

  @IsOptional()
  @IsEnum(RequestPriority)
  priority?: RequestPriority;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  serviceTypeId?: string;

  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @IsOptional()
  @IsDateString()
  @Validate(CreatedDateRangeConstraint)
  createdTo?: string;

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

export interface ServiceRequestListItemResponseDto {
  id: string;
  customer: { id: string; fullName: string };
  category: { id: string; code: string; name: string };
  serviceType: { id: string; code: string; name: string; isOther: boolean };
  address: { id: string; city: string; line1: string };
  status: ServiceRequestStatus;
  priority: RequestPriority;
  preferredStartAt: string;
  preferredEndAt: string;
  assignmentDeadlineAt: string;
  completionDeadlineAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRequestListResponseDto {
  data: ServiceRequestListItemResponseDto[];
  meta: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface ServiceRequestDetailResponseDto {
  data: {
    id: string;
    customer: { id: string; fullName: string; email: string; phone: string | null };
    category: { id: string; code: string; name: string };
    serviceType: { id: string; code: string; name: string; isOther: boolean };
    address: {
      id: string;
      serviceArea: { id: string; code: string; name: string };
      line1: string;
      line2: string | null;
      city: string;
      postalCode: string | null;
      notes: string | null;
    };
    slaPolicy: { id: string; code: string; name: string };
    status: ServiceRequestStatus;
    priority: RequestPriority;
    description: string;
    additionalContactInstructions: string | null;
    preferredStartAt: string;
    preferredEndAt: string;
    estimatedDurationMinutes: number;
    assignmentDeadlineAt: string;
    completionDeadlineAt: string;
    triagedAt: string | null;
    assignedAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    cancellationReason: string | null;
    escalatedAt: string | null;
    requiredSkills: Array<{ id: string; code: string; name: string }>;
    attachments: Array<{
      id: string;
      uploadedByUserId: string;
      fileName: string;
      mimeType: string;
      storageKey: string;
      kind: string;
      createdAt: string;
    }>;
    createdAt: string;
    updatedAt: string;
  };
}

export const toServiceRequestListResponse = (
  requests: ServiceRequestSummary[],
  pagination: { limit: number; offset: number; total: number },
): ServiceRequestListResponseDto => ({
  data: requests.map((request) => ({
    ...request,
    preferredStartAt: request.preferredStartAt.toISOString(),
    preferredEndAt: request.preferredEndAt.toISOString(),
    assignmentDeadlineAt: request.assignmentDeadlineAt.toISOString(),
    completionDeadlineAt: request.completionDeadlineAt.toISOString(),
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  })),
  meta: pagination,
});

export const toServiceRequestDetailResponse = (
  request: ServiceRequestDetail,
): ServiceRequestDetailResponseDto => ({
  data: {
    ...request,
    preferredStartAt: request.preferredStartAt.toISOString(),
    preferredEndAt: request.preferredEndAt.toISOString(),
    assignmentDeadlineAt: request.assignmentDeadlineAt.toISOString(),
    completionDeadlineAt: request.completionDeadlineAt.toISOString(),
    triagedAt: request.triagedAt?.toISOString() ?? null,
    assignedAt: request.assignedAt?.toISOString() ?? null,
    completedAt: request.completedAt?.toISOString() ?? null,
    cancelledAt: request.cancelledAt?.toISOString() ?? null,
    escalatedAt: request.escalatedAt?.toISOString() ?? null,
    attachments: request.attachments.map((attachment) => ({
      ...attachment,
      createdAt: attachment.createdAt.toISOString(),
    })),
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  },
});
