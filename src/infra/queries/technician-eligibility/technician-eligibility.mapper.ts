import { EligibleTechnicianCandidate } from '@application/read-models';

import { EligibleTechnicianRow } from './technician-eligibility.types';

export class TechnicianEligibilityMapper {
  static toCandidate(row: EligibleTechnicianRow): EligibleTechnicianCandidate {
    return {
      technicianId: row.technicianId,
      user: { id: row.userId, fullName: row.userFullName },
      rating: row.rating === null ? null : Number(row.rating),
      dailyAssignmentLimit: row.dailyAssignmentLimit,
      skillIds: row.skillIds,
      serviceAreaIds: row.serviceAreaIds,
      activeAssignmentCount: Number(row.activeAssignmentCount),
    };
  }
}
