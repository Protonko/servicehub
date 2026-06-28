import { Assignment, AssignmentStatus, AssignmentTimeSlot } from '@domain/model';

describe('Assignment', () => {
  it('creates an assigned record for the selected slot', () => {
    const slot = AssignmentTimeSlot.create({
      startsAt: new Date('2026-07-10T09:00:00.000Z'),
      endsAt: new Date('2026-07-10T11:00:00.000Z'),
    });

    const assignment = Assignment.create({
      serviceRequestId: 'request-id',
      technicianId: 'technician-id',
      assignedByUserId: 'dispatcher-id',
      slot,
    });

    expect(assignment).toEqual(
      expect.objectContaining({
        serviceRequestId: 'request-id',
        technicianId: 'technician-id',
        assignedByUserId: 'dispatcher-id',
        status: AssignmentStatus.Assigned,
        acceptedAt: null,
        cancelledAt: null,
      }),
    );
    expect(assignment.startsAt).toEqual(slot.startsAt);
    expect(assignment.endsAt).toEqual(slot.endsAt);
  });
});
