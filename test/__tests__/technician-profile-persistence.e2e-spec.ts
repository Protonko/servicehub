import { randomUUID } from 'node:crypto';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { Technician, TechnicianStatus } from '@domain/model';
import { DuplicateTechnicianProfileError } from '@domain/exceptions';
import { TECHNICIAN_REPOSITORY, TechnicianRepository } from '@domain/repositories';
import { AppModule } from '../../src/app.module';

jest.setTimeout(30000);

const testRunId = randomUUID().replaceAll('-', '').slice(0, 12);
const userId = randomUUID();
const duplicateUserId = randomUUID();
const skillId = randomUUID();
const secondSkillId = randomUUID();
const serviceAreaId = randomUUID();
const secondServiceAreaId = randomUUID();

describe('Technician profile persistence', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let technicianRepository: TechnicianRepository;
  let technician: Technician;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    technicianRepository = app.get<TechnicianRepository>(TECHNICIAN_REPOSITORY);

    await cleanupRows();
    await seedRows();
  });

  afterAll(async () => {
    if (dataSource) {
      await cleanupRows();
    }

    if (app) {
      await app.close();
    }
  });

  it('creates and reloads a technician with skill and service-area links', async () => {
    technician = Technician.create({
      userId,
      status: TechnicianStatus.Active,
      dailyAssignmentLimit: 5,
      rating: 4.5,
      skillIds: [skillId],
      serviceAreaIds: [serviceAreaId],
    });

    const saved = await technicianRepository.save(technician);
    const reloaded = await technicianRepository.findByUserId(userId);

    expect(saved.id).toBe(technician.id);
    expect(saved.skillIds).toEqual([skillId]);
    expect(saved.serviceAreaIds).toEqual([serviceAreaId]);
    expect(saved.rating).toBe(4.5);
    expect(reloaded?.id).toBe(technician.id);
    expect(reloaded?.isAssignmentEligible()).toBe(true);
  });

  it('rejects a duplicate profile for the same user', async () => {
    const duplicate = Technician.create({
      userId,
      dailyAssignmentLimit: 3,
      serviceAreaIds: [serviceAreaId],
    });

    await expect(technicianRepository.save(duplicate)).rejects.toBeInstanceOf(
      DuplicateTechnicianProfileError,
    );

    expect(await technicianRepository.findByUserId(userId)).not.toBeNull();
  });

  it('atomically replaces skills and service areas', async () => {
    const updated = technician.update({
      status: TechnicianStatus.OnLeave,
      dailyAssignmentLimit: 6,
      skillIds: [secondSkillId],
      serviceAreaIds: [secondServiceAreaId],
    });

    technician = await technicianRepository.save(updated);

    expect(technician.status).toBe(TechnicianStatus.OnLeave);
    expect(technician.skillIds).toEqual([secondSkillId]);
    expect(technician.serviceAreaIds).toEqual([secondServiceAreaId]);
  });

  it('rolls back profile and links when a replacement link is invalid', async () => {
    const invalidUpdate = technician.update({
      dailyAssignmentLimit: 9,
      skillIds: [randomUUID()],
      serviceAreaIds: [serviceAreaId],
    });

    await expect(technicianRepository.save(invalidUpdate)).rejects.toMatchObject({
      code: '23503',
    });

    const reloaded = await technicianRepository.findById(technician.id);

    expect(reloaded?.dailyAssignmentLimit).toBe(6);
    expect(reloaded?.skillIds).toEqual([secondSkillId]);
    expect(reloaded?.serviceAreaIds).toEqual([secondServiceAreaId]);
  });

  it('enforces one profile per user at the database boundary', async () => {
    const profile = Technician.create({
      userId: duplicateUserId,
      dailyAssignmentLimit: 4,
      serviceAreaIds: [serviceAreaId],
    });

    await technicianRepository.save(profile);

    await expect(
      dataSource.query(
        `
          INSERT INTO technicians (user_id, status, daily_assignment_limit)
          VALUES ($1, 'active', 4)
        `,
        [duplicateUserId],
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });

  const seedRows = async (): Promise<void> => {
    await dataSource.query(
      `
        INSERT INTO users (id, email, password_hash, full_name, is_active)
        VALUES
          ($1, $2, 'hash', 'Technician Persistence User', true),
          ($3, $4, 'hash', 'Duplicate Technician User', true)
      `,
      [
        userId,
        `technician-persistence-${testRunId}@example.com`,
        duplicateUserId,
        `duplicate-technician-${testRunId}@example.com`,
      ],
    );

    await dataSource.query(
      `
        INSERT INTO skills (id, code, name, is_active)
        VALUES
          ($1, $2, 'Technician Persistence Skill', true),
          ($3, $4, 'Second Technician Persistence Skill', true)
      `,
      [skillId, `TECH_PERSIST_${testRunId}`, secondSkillId, `TECH_PERSIST_SECOND_${testRunId}`],
    );

    await dataSource.query(
      `
        INSERT INTO service_areas (id, code, name, is_active)
        VALUES
          ($1, $2, 'Technician Persistence Area', true),
          ($3, $4, 'Second Technician Persistence Area', true)
      `,
      [
        serviceAreaId,
        `TECH_AREA_${testRunId}`,
        secondServiceAreaId,
        `TECH_AREA_SECOND_${testRunId}`,
      ],
    );
  };

  const cleanupRows = async (): Promise<void> => {
    await dataSource.query('DELETE FROM technicians WHERE user_id IN ($1, $2)', [
      userId,
      duplicateUserId,
    ]);
    await dataSource.query('DELETE FROM skills WHERE id IN ($1, $2)', [skillId, secondSkillId]);
    await dataSource.query('DELETE FROM service_areas WHERE id IN ($1, $2)', [
      serviceAreaId,
      secondServiceAreaId,
    ]);
    await dataSource.query('DELETE FROM users WHERE id IN ($1, $2)', [userId, duplicateUserId]);
  };
});
