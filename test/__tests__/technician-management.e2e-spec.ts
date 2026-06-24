import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { ACCESS_TOKEN_COOKIE } from '@application/auth';
import { AUTH_TOKEN_SERVICE, AuthTokenService } from '@contract/auth';
import { RoleCode, TechnicianStatus } from '@domain/model';
import { AppModule } from '../../src/app.module';

jest.setTimeout(30000);

const testRunId = randomUUID().replaceAll('-', '').slice(0, 12);
const managedUserId = randomUUID();
const inactiveUserId = randomUUID();
const inactiveSkillUserId = randomUUID();
const inactiveAreaUserId = randomUUID();
const concurrentUserId = randomUUID();
const activeSkillId = randomUUID();
const secondSkillId = randomUUID();
const inactiveSkillId = randomUUID();
const activeAreaId = randomUUID();
const secondAreaId = randomUUID();
const inactiveAreaId = randomUUID();

describe('Technician management API', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authTokenService: AuthTokenService;
  let httpServer: Server;
  let technicianId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = app.get(DataSource);
    authTokenService = app.get<AuthTokenService>(AUTH_TOKEN_SERVICE);
    httpServer = app.getHttpServer() as Server;

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

  it('requires authentication and admin role for creation', async () => {
    const body = createBody(managedUserId);

    await request(httpServer).post('/api/v1/admin/technicians').send(body).expect(401);
    await request(httpServer)
      .post('/api/v1/admin/technicians')
      .set('Cookie', authCookie(RoleCode.Dispatcher))
      .send(body)
      .expect(403);
  });

  it('allows an admin to create a technician with persisted links', async () => {
    const response = await request(httpServer)
      .post('/api/v1/admin/technicians')
      .set('Cookie', authCookie(RoleCode.Admin))
      .send(createBody(managedUserId))
      .expect(201);

    technicianId = response.body.data.id as string;
    expect(response.body.data).toEqual({
      id: expect.any(String),
      userId: managedUserId,
      status: TechnicianStatus.Active,
      dailyAssignmentLimit: 4,
      rating: null,
      skillIds: [activeSkillId],
      serviceAreaIds: [activeAreaId],
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    const skillLinks = await dataSource.query<{ skill_id: string }[]>(
      'SELECT skill_id FROM technician_skills WHERE technician_id = $1',
      [technicianId],
    );
    const areaLinks = await dataSource.query<{ service_area_id: string }[]>(
      'SELECT service_area_id FROM technician_service_areas WHERE technician_id = $1',
      [technicianId],
    );

    expect(skillLinks).toEqual([{ skill_id: activeSkillId }]);
    expect(areaLinks).toEqual([{ service_area_id: activeAreaId }]);
  });

  it('returns conflict for a duplicate profile', async () => {
    const response = await request(httpServer)
      .post('/api/v1/admin/technicians')
      .set('Cookie', authCookie(RoleCode.Admin))
      .send(createBody(managedUserId))
      .expect(409);

    expect(response.body.error.code).toBe('TECHNICIAN_PROFILE_ALREADY_EXISTS');
  });

  it('returns one success and one conflict for concurrent profile creation', async () => {
    const responses = await Promise.all([
      request(httpServer)
        .post('/api/v1/admin/technicians')
        .set('Cookie', authCookie(RoleCode.Admin))
        .send(createBody(concurrentUserId)),
      request(httpServer)
        .post('/api/v1/admin/technicians')
        .set('Cookie', authCookie(RoleCode.Admin))
        .send(createBody(concurrentUserId)),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(responses.find((response) => response.status === 409)?.body.error.code).toBe(
      'TECHNICIAN_PROFILE_ALREADY_EXISTS',
    );
  });

  it('rejects inactive users, skills, and service areas', async () => {
    const inactiveUserResponse = await request(httpServer)
      .post('/api/v1/admin/technicians')
      .set('Cookie', authCookie(RoleCode.Admin))
      .send(createBody(inactiveUserId))
      .expect(404);
    expect(inactiveUserResponse.body.error.code).toBe('TECHNICIAN_USER_NOT_FOUND');

    const inactiveSkillResponse = await request(httpServer)
      .post('/api/v1/admin/technicians')
      .set('Cookie', authCookie(RoleCode.Admin))
      .send({ ...createBody(inactiveSkillUserId), skillIds: [inactiveSkillId] })
      .expect(404);
    expect(inactiveSkillResponse.body.error.code).toBe('TECHNICIAN_SKILL_NOT_FOUND');

    const inactiveAreaResponse = await request(httpServer)
      .post('/api/v1/admin/technicians')
      .set('Cookie', authCookie(RoleCode.Admin))
      .send({ ...createBody(inactiveAreaUserId), serviceAreaIds: [inactiveAreaId] })
      .expect(404);
    expect(inactiveAreaResponse.body.error.code).toBe('TECHNICIAN_SERVICE_AREA_NOT_FOUND');
  });

  it('rejects invalid create and update DTOs', async () => {
    await request(httpServer)
      .post('/api/v1/admin/technicians')
      .set('Cookie', authCookie(RoleCode.Admin))
      .send({ ...createBody(inactiveSkillUserId), serviceAreaIds: [] })
      .expect(400);

    await request(httpServer)
      .patch('/api/v1/admin/technicians/not-a-uuid')
      .set('Cookie', authCookie(RoleCode.Admin))
      .send({ status: TechnicianStatus.Inactive })
      .expect(400);

    const emptyUpdate = await request(httpServer)
      .patch(`/api/v1/admin/technicians/${technicianId}`)
      .set('Cookie', authCookie(RoleCode.Admin))
      .send({})
      .expect(400);
    expect(emptyUpdate.body.error.code).toBe('EMPTY_UPDATE');
  });

  it('updates profile fields and links atomically', async () => {
    const response = await request(httpServer)
      .patch(`/api/v1/admin/technicians/${technicianId}`)
      .set('Cookie', authCookie(RoleCode.Admin))
      .send({
        status: TechnicianStatus.OnLeave,
        dailyAssignmentLimit: 6,
        skillIds: [secondSkillId],
        serviceAreaIds: [secondAreaId],
      })
      .expect(200);

    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: technicianId,
        status: TechnicianStatus.OnLeave,
        dailyAssignmentLimit: 6,
        skillIds: [secondSkillId],
        serviceAreaIds: [secondAreaId],
      }),
    );
  });

  it('allows admins and dispatchers to list profiles but rejects customers', async () => {
    for (const role of [RoleCode.Admin, RoleCode.Dispatcher]) {
      const response = await request(httpServer)
        .get('/api/v1/admin/technicians')
        .set('Cookie', authCookie(role))
        .expect(200);
      const item = response.body.data.find(
        (candidate: { id: string }) => candidate.id === technicianId,
      );

      expect(item).toEqual(
        expect.objectContaining({
          id: technicianId,
          user: {
            id: managedUserId,
            email: `managed-technician-${testRunId}@example.com`,
            fullName: 'Managed Technician',
          },
          status: TechnicianStatus.OnLeave,
          dailyAssignmentLimit: 6,
          skills: [{ id: secondSkillId, code: expect.any(String), name: 'Second Skill' }],
          serviceAreas: [
            { id: secondAreaId, code: expect.any(String), name: 'Second Service Area' },
          ],
        }),
      );
    }

    await request(httpServer)
      .get('/api/v1/admin/technicians')
      .set('Cookie', authCookie(RoleCode.Customer))
      .expect(403);
  });

  const createBody = (userId: string) => ({
    userId,
    dailyAssignmentLimit: 4,
    skillIds: [activeSkillId],
    serviceAreaIds: [activeAreaId],
  });

  const authCookie = (role: RoleCode): string => {
    const tokens = authTokenService.issueTokens({ sub: randomUUID(), roles: [role] });
    return `${ACCESS_TOKEN_COOKIE}=${tokens.accessToken}`;
  };

  const seedRows = async (): Promise<void> => {
    await dataSource.query(
      `
        INSERT INTO users (id, email, password_hash, full_name, is_active)
        VALUES
          ($1, $2, 'hash', 'Managed Technician', true),
          ($3, $4, 'hash', 'Inactive Technician User', false),
          ($5, $6, 'hash', 'Inactive Skill User', true),
          ($7, $8, 'hash', 'Inactive Area User', true),
          ($9, $10, 'hash', 'Concurrent Technician User', true)
      `,
      [
        managedUserId,
        `managed-technician-${testRunId}@example.com`,
        inactiveUserId,
        `inactive-technician-${testRunId}@example.com`,
        inactiveSkillUserId,
        `inactive-skill-user-${testRunId}@example.com`,
        inactiveAreaUserId,
        `inactive-area-user-${testRunId}@example.com`,
        concurrentUserId,
        `concurrent-technician-${testRunId}@example.com`,
      ],
    );

    await dataSource.query(
      `
        INSERT INTO user_roles (user_id, role_id)
        SELECT user_id, roles.id
        FROM unnest($1::uuid[]) AS selected_users(user_id)
        CROSS JOIN roles
        WHERE roles.code = 'technician'
      `,
      [[managedUserId, inactiveUserId, inactiveSkillUserId, inactiveAreaUserId, concurrentUserId]],
    );

    await dataSource.query(
      `
        INSERT INTO skills (id, code, name, is_active)
        VALUES
          ($1, $2, 'Active Skill', true),
          ($3, $4, 'Second Skill', true),
          ($5, $6, 'Inactive Skill', false)
      `,
      [
        activeSkillId,
        `TECH_MGMT_ACTIVE_${testRunId}`,
        secondSkillId,
        `TECH_MGMT_SECOND_${testRunId}`,
        inactiveSkillId,
        `TECH_MGMT_INACTIVE_${testRunId}`,
      ],
    );

    await dataSource.query(
      `
        INSERT INTO service_areas (id, code, name, is_active)
        VALUES
          ($1, $2, 'Active Service Area', true),
          ($3, $4, 'Second Service Area', true),
          ($5, $6, 'Inactive Service Area', false)
      `,
      [
        activeAreaId,
        `TECH_MGMT_ACTIVE_AREA_${testRunId}`,
        secondAreaId,
        `TECH_MGMT_SECOND_AREA_${testRunId}`,
        inactiveAreaId,
        `TECH_MGMT_INACTIVE_AREA_${testRunId}`,
      ],
    );
  };

  const cleanupRows = async (): Promise<void> => {
    const userIds = [
      managedUserId,
      inactiveUserId,
      inactiveSkillUserId,
      inactiveAreaUserId,
      concurrentUserId,
    ];
    const skillIds = [activeSkillId, secondSkillId, inactiveSkillId];
    const areaIds = [activeAreaId, secondAreaId, inactiveAreaId];

    await dataSource.query('DELETE FROM technicians WHERE user_id = ANY($1::uuid[])', [userIds]);
    await dataSource.query('DELETE FROM user_roles WHERE user_id = ANY($1::uuid[])', [userIds]);
    await dataSource.query('DELETE FROM skills WHERE id = ANY($1::uuid[])', [skillIds]);
    await dataSource.query('DELETE FROM service_areas WHERE id = ANY($1::uuid[])', [areaIds]);
    await dataSource.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [userIds]);
  };
});
