import { ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

import { TechnicianManagementListItem } from '@application/read-models';
import { Technician, TechnicianStatus } from '@domain/model';

export class CreateTechnicianRequestDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsEnum(TechnicianStatus)
  status?: TechnicianStatus;

  @IsInt()
  @Min(1)
  dailyAssignmentLimit!: number;

  @IsArray()
  @IsUUID(undefined, { each: true })
  skillIds!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  serviceAreaIds!: string[];
}

export class UpdateTechnicianRequestDto {
  @IsOptional()
  @IsEnum(TechnicianStatus)
  status?: TechnicianStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  dailyAssignmentLimit?: number;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  skillIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  serviceAreaIds?: string[];
}

export interface TechnicianWriteResponseDto {
  id: string;
  userId: string;
  status: TechnicianStatus;
  dailyAssignmentLimit: number;
  rating: number | null;
  skillIds: string[];
  serviceAreaIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TechnicianListItemResponseDto {
  id: string;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  status: TechnicianStatus;
  dailyAssignmentLimit: number;
  rating: number | null;
  skills: { id: string; code: string; name: string }[];
  serviceAreas: { id: string; code: string; name: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface TechnicianObjectResponseDto {
  data: TechnicianWriteResponseDto;
}

export interface TechnicianListResponseDto {
  data: TechnicianListItemResponseDto[];
}

export const toTechnicianResponse = (technician: Technician): TechnicianObjectResponseDto => ({
  data: {
    id: technician.id,
    userId: technician.userId,
    status: technician.status,
    dailyAssignmentLimit: technician.dailyAssignmentLimit,
    rating: technician.rating,
    skillIds: technician.skillIds,
    serviceAreaIds: technician.serviceAreaIds,
    createdAt: technician.createdAt?.toISOString() ?? '',
    updatedAt: technician.updatedAt?.toISOString() ?? '',
  },
});

export const toTechnicianListResponse = (
  technicians: TechnicianManagementListItem[],
): TechnicianListResponseDto => ({
  data: technicians.map((technician) => ({
    ...technician,
    createdAt: technician.createdAt.toISOString(),
    updatedAt: technician.updatedAt.toISOString(),
  })),
});
