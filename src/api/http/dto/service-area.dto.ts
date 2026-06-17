import { ServiceAreaSummary } from '@application/read-models';

export interface ServiceAreaResponseDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export interface ServiceAreaListResponseDto {
  data: ServiceAreaResponseDto[];
}

export const toServiceAreaListResponse = (
  serviceAreas: ServiceAreaSummary[],
): ServiceAreaListResponseDto => ({
  data: serviceAreas.map((serviceArea) => ({
    id: serviceArea.id,
    code: serviceArea.code,
    name: serviceArea.name,
    description: serviceArea.description,
  })),
});
