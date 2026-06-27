import { InvalidAssignmentTimeSlotError } from '@domain/exceptions';
import { AssignmentTimeSlot } from '@domain/model';

describe('AssignmentTimeSlot', () => {
  it('rejects an invalid date and a non-positive range', () => {
    expect(() =>
      AssignmentTimeSlot.create({
        startsAt: new Date('invalid'),
        endsAt: new Date('2026-06-22T11:00:00.000Z'),
      }),
    ).toThrow(InvalidAssignmentTimeSlotError);

    expect(() =>
      AssignmentTimeSlot.create({
        startsAt: new Date('2026-06-22T11:00:00.000Z'),
        endsAt: new Date('2026-06-22T11:00:00.000Z'),
      }),
    ).toThrow(InvalidAssignmentTimeSlotError);
  });

  it('uses half-open interval overlap semantics', () => {
    const slot = AssignmentTimeSlot.create({
      startsAt: new Date('2026-06-22T10:00:00.000Z'),
      endsAt: new Date('2026-06-22T11:00:00.000Z'),
    });
    const adjacentSlot = AssignmentTimeSlot.create({
      startsAt: new Date('2026-06-22T11:00:00.000Z'),
      endsAt: new Date('2026-06-22T12:00:00.000Z'),
    });
    const overlappingSlot = AssignmentTimeSlot.create({
      startsAt: new Date('2026-06-22T10:30:00.000Z'),
      endsAt: new Date('2026-06-22T11:30:00.000Z'),
    });

    expect(slot.overlaps(adjacentSlot)).toBe(false);
    expect(slot.overlaps(overlappingSlot)).toBe(true);
  });

  it('checks full containment', () => {
    const coveringSlot = AssignmentTimeSlot.create({
      startsAt: new Date('2026-06-22T09:00:00.000Z'),
      endsAt: new Date('2026-06-22T12:00:00.000Z'),
    });
    const containedSlot = AssignmentTimeSlot.create({
      startsAt: new Date('2026-06-22T10:00:00.000Z'),
      endsAt: new Date('2026-06-22T11:00:00.000Z'),
    });

    expect(coveringSlot.contains(containedSlot)).toBe(true);
    expect(containedSlot.contains(coveringSlot)).toBe(false);
  });
});
