import { IsDateString } from 'class-validator';

import { EligibleTechnicianSearchResult } from '@application/read-models';

export class EligibleTechniciansQueryDto {
  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;
}

export interface EligibleTechnicianCandidateResponseDto {
  technicianId: string;
  user: { id: string; fullName: string };
  rating: number | null;
  dailyAssignmentLimit: number;
  skillIds: string[];
  serviceAreaIds: string[];
  activeAssignmentCount: number;
}

export interface EligibleTechnicianSearchResponseDto {
  data: {
    requestId: string;
    startsAt: string;
    endsAt: string;
    candidates: EligibleTechnicianCandidateResponseDto[];
  };
}

export const toEligibleTechnicianSearchResponse = (
  result: EligibleTechnicianSearchResult,
): EligibleTechnicianSearchResponseDto => ({
  data: {
    requestId: result.requestId,
    startsAt: result.startsAt.toISOString(),
    endsAt: result.endsAt.toISOString(),
    candidates: result.candidates,
  },
});
