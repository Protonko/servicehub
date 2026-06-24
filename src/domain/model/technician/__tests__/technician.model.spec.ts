import { randomUUID } from 'node:crypto';

import { Technician, TechnicianStatus } from '..';

describe('Technician', () => {
  it('creates an active assignment-eligible profile and removes duplicate links', () => {
    const skillId = randomUUID();
    const serviceAreaId = randomUUID();

    const technician = Technician.create({
      userId: randomUUID(),
      dailyAssignmentLimit: 5,
      rating: 4.75,
      skillIds: [skillId, skillId],
      serviceAreaIds: [serviceAreaId, serviceAreaId],
    });

    expect(technician.status).toBe(TechnicianStatus.Active);
    expect(technician.isAssignmentEligible()).toBe(true);
    expect(technician.skillIds).toEqual([skillId]);
    expect(technician.serviceAreaIds).toEqual([serviceAreaId]);
  });

  it.each([TechnicianStatus.Inactive, TechnicianStatus.OnLeave, TechnicianStatus.Suspended])(
    'treats %s status as not assignment-eligible',
    (status) => {
      const technician = Technician.create({
        userId: randomUUID(),
        status,
        dailyAssignmentLimit: 5,
        serviceAreaIds: [randomUUID()],
      });

      expect(technician.isAssignmentEligible()).toBe(false);
    },
  );

  it.each([0, -1, 1.5])('rejects invalid daily assignment limit %s', (limit) => {
    expect(() =>
      Technician.create({
        userId: randomUUID(),
        dailyAssignmentLimit: limit,
        serviceAreaIds: [randomUUID()],
      }),
    ).toThrow('dailyAssignmentLimit must be a positive integer');
  });

  it.each([-0.01, 5.01, Number.NaN])('rejects invalid rating %s', (rating) => {
    expect(() =>
      Technician.create({
        userId: randomUUID(),
        dailyAssignmentLimit: 5,
        rating,
        serviceAreaIds: [randomUUID()],
      }),
    ).toThrow('rating must be between 0 and 5');
  });

  it('rejects a profile without a service area', () => {
    expect(() =>
      Technician.create({
        userId: randomUUID(),
        dailyAssignmentLimit: 5,
        serviceAreaIds: [],
      }),
    ).toThrow('technician must have at least one service area');
  });
});
