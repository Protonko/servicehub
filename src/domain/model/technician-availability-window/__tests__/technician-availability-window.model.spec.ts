import { InvalidTechnicianAvailabilityWindowError } from '@domain/exceptions';
import { TechnicianAvailabilityWindow } from '../technician-availability-window.model';

describe('TechnicianAvailabilityWindow', () => {
  const startsAt = new Date('2026-07-01T09:00:00.000Z');
  const endsAt = new Date('2026-07-01T17:00:00.000Z');

  it('creates available and blocked windows with normalized reasons', () => {
    const available = TechnicianAvailabilityWindow.create({
      technicianId: 'technician-id',
      startsAt,
      endsAt,
      isAvailable: true,
      reason: '  Regular shift  ',
    });
    const blocked = TechnicianAvailabilityWindow.create({
      technicianId: 'technician-id',
      startsAt,
      endsAt,
      isAvailable: false,
      reason: '   ',
    });

    expect(available.reason).toBe('Regular shift');
    expect(available.isAvailable).toBe(true);
    expect(blocked.reason).toBeNull();
    expect(blocked.isAvailable).toBe(false);
  });

  it.each([
    [endsAt, startsAt],
    [startsAt, startsAt],
  ])('rejects a range whose start is not before its end', (invalidStart, invalidEnd) => {
    expect(() =>
      TechnicianAvailabilityWindow.create({
        technicianId: 'technician-id',
        startsAt: invalidStart,
        endsAt: invalidEnd,
        isAvailable: true,
      }),
    ).toThrow(InvalidTechnicianAvailabilityWindowError);
  });

  it('rejects invalid dates and reasons longer than the persistence limit', () => {
    expect(() =>
      TechnicianAvailabilityWindow.create({
        technicianId: 'technician-id',
        startsAt: new Date('invalid'),
        endsAt,
        isAvailable: true,
      }),
    ).toThrow('startsAt must be a valid date');

    expect(() =>
      TechnicianAvailabilityWindow.create({
        technicianId: 'technician-id',
        startsAt,
        endsAt,
        isAvailable: true,
        reason: 'x'.repeat(161),
      }),
    ).toThrow(InvalidTechnicianAvailabilityWindowError);
  });
});
