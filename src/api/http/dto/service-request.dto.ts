import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { trimString } from '@common/utils/trim-string';
import { trimStringToNull } from '@common/utils/trim-string-to-null';
import { CreatedServiceRequest, ServiceRequestAttachmentSnapshot } from '@domain/repositories';

export class CreateServiceRequestAttachmentRequestDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  fileName!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  mimeType!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  storageKey!: string;
}

export class CreateServiceRequestRequestDto {
  @IsUUID()
  categoryId!: string;

  @IsUUID()
  serviceTypeId!: string;

  @IsUUID()
  addressId!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  description!: string;

  @IsDateString()
  preferredStartAt!: string;

  @IsDateString()
  preferredEndAt!: string;

  @Transform(({ value }) => trimStringToNull(value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  additionalContactInstructions?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreateServiceRequestAttachmentRequestDto)
  attachments?: CreateServiceRequestAttachmentRequestDto[];
}

export interface ServiceRequestAttachmentResponseDto {
  id: string;
  fileName: string;
  mimeType: string;
  storageKey: string;
  kind: string;
}

export interface ServiceRequestResponseDto {
  id: string;
  customerId: string;
  categoryId: string;
  serviceTypeId: string;
  addressId: string;
  slaPolicyId: string;
  status: string;
  priority: string;
  description: string;
  additionalContactInstructions: string | null;
  preferredStartAt: string;
  preferredEndAt: string;
  estimatedDurationMinutes: number;
  assignmentDeadlineAt: string;
  completionDeadlineAt: string;
  requiredSkillIds: string[];
  attachments: ServiceRequestAttachmentResponseDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRequestObjectResponseDto {
  data: ServiceRequestResponseDto;
}

export const toServiceRequestResponse = (
  created: CreatedServiceRequest,
): ServiceRequestObjectResponseDto => ({
  data: {
    id: created.request.id,
    customerId: created.request.customerId,
    categoryId: created.request.categoryId,
    serviceTypeId: created.request.serviceTypeId,
    addressId: created.request.addressId,
    slaPolicyId: created.request.slaPolicyId,
    status: created.request.status,
    priority: created.request.priority,
    description: created.request.description,
    additionalContactInstructions: created.request.additionalContactInstructions,
    preferredStartAt: created.request.preferredStartAt.toISOString(),
    preferredEndAt: created.request.preferredEndAt.toISOString(),
    estimatedDurationMinutes: created.request.estimatedDurationMinutes,
    assignmentDeadlineAt: created.request.assignmentDeadlineAt.toISOString(),
    completionDeadlineAt: created.request.completionDeadlineAt.toISOString(),
    requiredSkillIds: created.requiredSkillIds,
    attachments: created.attachments.map(toAttachmentResponse),
    createdAt: (created.request.createdAt ?? new Date(0)).toISOString(),
    updatedAt: (created.request.updatedAt ?? new Date(0)).toISOString(),
  },
});

const toAttachmentResponse = (
  attachment: ServiceRequestAttachmentSnapshot,
): ServiceRequestAttachmentResponseDto => ({
  id: attachment.id,
  fileName: attachment.fileName,
  mimeType: attachment.mimeType,
  storageKey: attachment.storageKey,
  kind: attachment.kind,
});
