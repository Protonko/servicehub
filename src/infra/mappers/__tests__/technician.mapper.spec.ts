import { randomUUID } from 'node:crypto';

import { TechnicianServiceAreaEntity } from '@db/entities/technician-service-area.entity';
import { TechnicianSkillEntity } from '@db/entities/technician-skill.entity';
import { TechnicianEntity } from '@db/entities/technician.entity';
import { TechnicianStatus } from '@domain/model';
import { TechnicianMapper } from '../technician.mapper';

describe('TechnicianMapper', () => {
  it('maps the persistence profile and links to the domain model', () => {
    const entity = new TechnicianEntity();
    const skill = new TechnicianSkillEntity();
    const serviceArea = new TechnicianServiceAreaEntity();

    entity.id = randomUUID();
    entity.userId = randomUUID();
    entity.status = TechnicianStatus.OnLeave;
    entity.dailyAssignmentLimit = 4;
    entity.rating = '4.25';
    entity.createdAt = new Date('2026-06-22T08:00:00.000Z');
    entity.updatedAt = new Date('2026-06-22T08:30:00.000Z');
    skill.technicianId = entity.id;
    skill.skillId = randomUUID();
    serviceArea.technicianId = entity.id;
    serviceArea.serviceAreaId = randomUUID();
    entity.skills = [skill];
    entity.serviceAreas = [serviceArea];

    const technician = TechnicianMapper.toDomain(entity);

    expect(technician.id).toBe(entity.id);
    expect(technician.userId).toBe(entity.userId);
    expect(technician.status).toBe(TechnicianStatus.OnLeave);
    expect(technician.dailyAssignmentLimit).toBe(4);
    expect(technician.rating).toBe(4.25);
    expect(technician.skillIds).toEqual([skill.skillId]);
    expect(technician.serviceAreaIds).toEqual([serviceArea.serviceAreaId]);
    expect(technician.createdAt).toEqual(entity.createdAt);
    expect(technician.updatedAt).toEqual(entity.updatedAt);
  });
});
