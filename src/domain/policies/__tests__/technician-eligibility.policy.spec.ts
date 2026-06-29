import {
  TechnicianMissingRequiredSkillsError,
  TechnicianNotActiveForAssignmentError,
  TechnicianOutsideServiceAreaError,
  TechnicianUnavailableForAssignmentError,
} from '@domain/exceptions';
import {
  AssignmentTimeSlot,
  Technician,
  TechnicianAvailabilityWindow,
  TechnicianStatus,
} from '@domain/model';
import { TechnicianEligibilityPolicy } from '../technician-eligibility.policy';

const requestedSlot = AssignmentTimeSlot.create({
  startsAt: new Date('2026-06-22T10:00:00.000Z'),
  endsAt: new Date('2026-06-22T11:00:00.000Z'),
});

const createTechnician = (
  overrides: Partial<{
    status: TechnicianStatus;
    skillIds: string[];
    serviceAreaIds: string[];
  }> = {},
): Technician =>
  Technician.rehydrate({
    id: 'technician-id',
    userId: 'technician-user-id',
    status: overrides.status ?? TechnicianStatus.Active,
    dailyAssignmentLimit: 5,
    rating: 4.8,
    skillIds: overrides.skillIds ?? ['skill-1', 'skill-2'],
    serviceAreaIds: overrides.serviceAreaIds ?? ['area-1'],
  });

const createWindow = (
  startsAt: string,
  endsAt: string,
  isAvailable: boolean,
): TechnicianAvailabilityWindow =>
  TechnicianAvailabilityWindow.rehydrate({
    id: `${startsAt}-${isAvailable}`,
    technicianId: 'technician-id',
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
    isAvailable,
    reason: isAvailable ? null : 'Blocked',
  });

const availableWindow = createWindow('2026-06-22T09:00:00.000Z', '2026-06-22T12:00:00.000Z', true);

const assertEligible = (
  overrides: Partial<Parameters<typeof TechnicianEligibilityPolicy.assertEligible>[0]> = {},
): void => {
  TechnicianEligibilityPolicy.assertEligible({
    technician: createTechnician(),
    requiredSkillIds: ['skill-1', 'skill-2'],
    serviceAreaId: 'area-1',
    availabilityWindows: [availableWindow],
    slot: requestedSlot,
    ...overrides,
  });
};

describe('TechnicianEligibilityPolicy', () => {
  it('allows an active technician with all skills, the area, and available coverage', () => {
    expect(() => assertEligible()).not.toThrow();
  });

  it('allows an empty required-skill set', () => {
    expect(() => assertEligible({ requiredSkillIds: [] })).not.toThrow();
  });

  it('rejects an inactive technician', () => {
    expect(() =>
      assertEligible({ technician: createTechnician({ status: TechnicianStatus.Inactive }) }),
    ).toThrow(TechnicianNotActiveForAssignmentError);
  });

  it('rejects a technician missing a required skill', () => {
    expect(() =>
      assertEligible({ technician: createTechnician({ skillIds: ['skill-1'] }) }),
    ).toThrow(TechnicianMissingRequiredSkillsError);
  });

  it('rejects a technician outside the request service area', () => {
    expect(() =>
      assertEligible({ technician: createTechnician({ serviceAreaIds: ['area-2'] }) }),
    ).toThrow(TechnicianOutsideServiceAreaError);
  });

  it('rejects a slot without full available-window coverage', () => {
    const partialWindow = createWindow(
      '2026-06-22T10:30:00.000Z',
      '2026-06-22T12:00:00.000Z',
      true,
    );

    expect(() => assertEligible({ availabilityWindows: [partialWindow] })).toThrow(
      TechnicianUnavailableForAssignmentError,
    );
  });

  it('rejects an overlapping blocked window', () => {
    const blockedWindow = createWindow(
      '2026-06-22T10:30:00.000Z',
      '2026-06-22T10:45:00.000Z',
      false,
    );

    expect(() => assertEligible({ availabilityWindows: [availableWindow, blockedWindow] })).toThrow(
      TechnicianUnavailableForAssignmentError,
    );
  });

  it('allows a blocked window adjacent to the requested slot', () => {
    const adjacentBlockedWindow = createWindow(
      '2026-06-22T11:00:00.000Z',
      '2026-06-22T12:00:00.000Z',
      false,
    );

    expect(() =>
      assertEligible({ availabilityWindows: [availableWindow, adjacentBlockedWindow] }),
    ).not.toThrow();
  });
});
