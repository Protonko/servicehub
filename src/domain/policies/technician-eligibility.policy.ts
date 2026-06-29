import { requireNonBlankString } from '@common/utils/require-non-blank-string';
import {
  TechnicianMissingRequiredSkillsError,
  TechnicianNotActiveForAssignmentError,
  TechnicianOutsideServiceAreaError,
  TechnicianUnavailableForAssignmentError,
} from '@domain/exceptions';
import { AssignmentTimeSlot, Technician, TechnicianAvailabilityWindow } from '@domain/model';

export interface TechnicianEligibilityPolicyInput {
  technician: Technician;
  requiredSkillIds: readonly string[];
  serviceAreaId: string;
  availabilityWindows: readonly TechnicianAvailabilityWindow[];
  slot: AssignmentTimeSlot;
}

export class TechnicianEligibilityPolicy {
  static assertEligible(input: TechnicianEligibilityPolicyInput): void {
    const serviceAreaId = requireNonBlankString(input.serviceAreaId, 'serviceAreaId');
    const requiredSkillIds = [
      ...new Set(
        input.requiredSkillIds.map((skillId) => requireNonBlankString(skillId, 'skillId')),
      ),
    ];

    if (!input.technician.isAssignmentEligible()) {
      throw new TechnicianNotActiveForAssignmentError();
    }

    const technicianSkillIds = new Set(input.technician.skillIds);
    const missingSkillIds = requiredSkillIds.filter((skillId) => !technicianSkillIds.has(skillId));

    if (missingSkillIds.length > 0) {
      throw new TechnicianMissingRequiredSkillsError(missingSkillIds);
    }

    if (!input.technician.serviceAreaIds.includes(serviceAreaId)) {
      throw new TechnicianOutsideServiceAreaError(serviceAreaId);
    }

    const technicianWindows = input.availabilityWindows.filter(
      (window) => window.technicianId === input.technician.id,
    );
    const hasAvailableCoverage = technicianWindows.some(
      (window) =>
        window.isAvailable && TechnicianEligibilityPolicy.toSlot(window).contains(input.slot),
    );
    const hasBlockedOverlap = technicianWindows.some(
      (window) =>
        !window.isAvailable && TechnicianEligibilityPolicy.toSlot(window).overlaps(input.slot),
    );

    if (!hasAvailableCoverage || hasBlockedOverlap) {
      throw new TechnicianUnavailableForAssignmentError();
    }
  }

  private static toSlot(window: TechnicianAvailabilityWindow): AssignmentTimeSlot {
    return AssignmentTimeSlot.create({
      startsAt: window.startsAt,
      endsAt: window.endsAt,
    });
  }
}
