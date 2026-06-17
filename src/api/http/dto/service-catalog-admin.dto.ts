import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

import { trimString } from '@common/utils/trim-string';
import { RequestPriority } from '@domain/model';
import { ServiceCategory, ServiceType } from '@domain/model';

export class CreateServiceCategoryRequestDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  @Matches(/^[A-Za-z0-9_]+$/)
  code!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateServiceCategoryRequestDto {
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateServiceTypeRequestDto {
  @IsUUID()
  categoryId!: string;

  @IsUUID()
  slaPolicyId!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  @Matches(/^[A-Za-z0-9_]+$/)
  code!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsEnum(RequestPriority)
  defaultPriority!: RequestPriority;

  @IsInt()
  @Min(1)
  estimatedDurationMinutes!: number;

  @IsBoolean()
  isOther!: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @IsUUID(undefined, { each: true })
  requiredSkillIds!: string[];
}

export class UpdateServiceTypeRequestDto {
  @IsOptional()
  @IsUUID()
  slaPolicyId?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(RequestPriority)
  defaultPriority?: RequestPriority;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedDurationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isOther?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  requiredSkillIds?: string[];
}

export interface ServiceCategoryAdminResponseDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface ServiceCategoryAdminObjectResponseDto {
  data: ServiceCategoryAdminResponseDto;
}

export interface ServiceTypeAdminResponseDto {
  id: string;
  categoryId: string;
  slaPolicyId: string;
  code: string;
  name: string;
  description: string | null;
  defaultPriority: RequestPriority;
  estimatedDurationMinutes: number;
  isOther: boolean;
  isActive: boolean;
  requiredSkillIds: string[];
}

export interface ServiceTypeAdminObjectResponseDto {
  data: ServiceTypeAdminResponseDto;
}

export const toServiceCategoryAdminResponse = (
  category: ServiceCategory,
): ServiceCategoryAdminObjectResponseDto => ({
  data: {
    id: category.id,
    code: category.code,
    name: category.name,
    description: category.description,
    isActive: category.isActive,
  },
});

export const toServiceTypeAdminResponse = (
  serviceType: ServiceType,
): ServiceTypeAdminObjectResponseDto => ({
  data: {
    id: serviceType.id,
    categoryId: serviceType.categoryId,
    slaPolicyId: serviceType.slaPolicyId,
    code: serviceType.code,
    name: serviceType.name,
    description: serviceType.description,
    defaultPriority: serviceType.defaultPriority,
    estimatedDurationMinutes: serviceType.estimatedDurationMinutes,
    isOther: serviceType.isOther,
    isActive: serviceType.isActive,
    requiredSkillIds: serviceType.requiredSkillIds,
  },
});
