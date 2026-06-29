import { EligibleTechnicianCandidate } from '@application/read-models';

export const TECHNICIAN_ELIGIBILITY_QUERY = Symbol('TECHNICIAN_ELIGIBILITY_QUERY');

export interface TechnicianEligibilityQuery {
  findEligibleTechnicians(
    requestId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<EligibleTechnicianCandidate[]>;
}
