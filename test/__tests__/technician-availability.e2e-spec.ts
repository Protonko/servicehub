import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { ACCESS_TOKEN_COOKIE } from '@application/auth';
import { AUTH_TOKEN_SERVICE, AuthTokenService } from '@contract/auth';
import { RoleCode } from '@domain/model';
import { AppModule } from '../../src/app.module';

jest.setTimeout(30000);

const testRunId = randomUUID().replaceAll('-', '').slice(0, 12);
const technicianUserId = randomUUID();
const otherTechnicianUserId = randomUUID();
const technicianId = randomUUID();
const otherTechnicianId = randomUUID();
const serviceAreaId = randomUUID();

describe('Technician availability API', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authTokenService: AuthTokenService;
  let httpServer: Server;

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

  it('requires authentication and admin role to create availability', async () => {
    await request(httpServer)
      .post(`/api/v1/admin/technicians/${technicianId}/availability-windows`)
      .send(windowBody('2026-07-02T09:00:00.000Z', '2026-07-02T17:00:00.000Z'))
      .expect(401);

    await request(httpServer)
      .post(`/api/v1/admin/technicians/${technicianId}/availability-windows`)
      .set('Cookie', authCookie(RoleCode.Dispatcher))
      .send(windowBody('2026-07-02T09:00:00.000Z', '2026-07-02T17:00:00.000Z'))
      .expect(403);
  });

  it('allows an admin to create available and blocked windows', async () => {
    const later = await request(httpServer)
      .post(`/api/v1/admin/technicians/${technicianId}/availability-windows`)
      .set('Cookie', authCookie(RoleCode.Admin))
      .send({
        ...windowBody('2026-07-02T09:00:00.000Z', '2026-07-02T17:00:00.000Z'),
        reason: '  Regular shift  ',
      })
      .expect(201);

    expect(later.body.data).toEqual({
      id: expect.any(String),
      technicianId,
      startsAt: '2026-07-02T09:00:00.000Z',
      endsAt: '2026-07-02T17:00:00.000Z',
      isAvailable: true,
      reason: 'Regular shift',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    const blocked = await request(httpServer)
      .post(`/api/v1/admin/technicians/${technicianId}/availability-windows`)
      .set('Cookie', authCookie(RoleCode.Admin))
      .send({
        ...windowBody('2026-07-01T12:00:00.000Z', '2026-07-01T13:00:00.000Z'),
        isAvailable: false,
        reason: 'Lunch',
      })
      .expect(201);

    expect(blocked.body.data.isAvailable).toBe(false);
    expect(blocked.body.data.reason).toBe('Lunch');
  });

  it('rejects missing technicians and invalid windows', async () => {
    const missing = await request(httpServer)
      .post(`/api/v1/admin/technicians/${randomUUID()}/availability-windows`)
      .set('Cookie', authCookie(RoleCode.Admin))
      .send(windowBody('2026-07-03T09:00:00.000Z', '2026-07-03T17:00:00.000Z'))
      .expect(404);
    expect(missing.body.error.code).toBe('TECHNICIAN_NOT_FOUND');

    const invalidRange = await request(httpServer)
      .post(`/api/v1/admin/technicians/${technicianId}/availability-windows`)
      .set('Cookie', authCookie(RoleCode.Admin))
      .send(windowBody('2026-07-03T17:00:00.000Z', '2026-07-03T09:00:00.000Z'))
      .expect(400);
    expect(invalidRange.body.error.code).toBe('TECHNICIAN_AVAILABILITY_INVALID');

    await request(httpServer)
      .post(`/api/v1/admin/technicians/${technicianId}/availability-windows`)
      .set('Cookie', authCookie(RoleCode.Admin))
      .send(windowBody('not-a-date', '2026-07-03T09:00:00.000Z'))
      .expect(400);

    await request(httpServer)
      .post(`/api/v1/admin/technicians/${technicianId}/availability-windows`)
      .set('Cookie', authCookie(RoleCode.Admin))
      .send(windowBody('2026-07-03T09:00:00.000Z', '2026-07-03T09:00:00.000Z'))
      .expect(400);

    await request(httpServer)
      .post(`/api/v1/admin/technicians/${technicianId}/availability-windows`)
      .set('Cookie', authCookie(RoleCode.Admin))
      .send({
        ...windowBody('2026-07-03T09:00:00.000Z', '2026-07-03T17:00:00.000Z'),
        isAvailable: 'true',
      })
      .expect(400);

    await request(httpServer)
      .post(`/api/v1/admin/technicians/${technicianId}/availability-windows`)
      .set('Cookie', authCookie(RoleCode.Admin))
      .send({
        ...windowBody('2026-07-03T09:00:00.000Z', '2026-07-03T17:00:00.000Z'),
        reason: 'x'.repeat(161),
      })
      .expect(400);
  });

  it('enforces the time range at the PostgreSQL boundary', async () => {
    await expect(
      dataSource.query(
        `
          INSERT INTO technician_availability_windows (
            technician_id, starts_at, ends_at, is_available
          )
          VALUES ($1, $2, $2, true)
        `,
        [technicianId, '2026-07-04T09:00:00.000Z'],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it.each([RoleCode.Admin, RoleCode.Dispatcher])(
    'allows %s to read availability in deterministic calendar order',
    async (role) => {
      const response = await request(httpServer)
        .get(`/api/v1/technicians/${technicianId}/calendar`)
        .set('Cookie', authCookie(role))
        .expect(200);

      expect(response.body.data.technicianId).toBe(technicianId);
      expect(response.body.data.availabilityWindows).toEqual([
        expect.objectContaining({
          startsAt: '2026-07-01T12:00:00.000Z',
          isAvailable: false,
          reason: 'Lunch',
        }),
        expect.objectContaining({
          startsAt: '2026-07-02T09:00:00.000Z',
          isAvailable: true,
          reason: 'Regular shift',
        }),
      ]);
    },
  );

  it('allows a technician to read only their own calendar', async () => {
    await request(httpServer)
      .get(`/api/v1/technicians/${technicianId}/calendar`)
      .set('Cookie', authCookie(RoleCode.Technician, technicianUserId))
      .expect(200);

    const forbidden = await request(httpServer)
      .get(`/api/v1/technicians/${otherTechnicianId}/calendar`)
      .set('Cookie', authCookie(RoleCode.Technician, technicianUserId))
      .expect(403);
    expect(forbidden.body.error.code).toBe('TECHNICIAN_CALENDAR_FORBIDDEN');

    await request(httpServer)
      .get(`/api/v1/technicians/${technicianId}/calendar`)
      .set('Cookie', authCookie(RoleCode.Customer, technicianUserId))
      .expect(403);
  });

  it('returns not found for a missing technician calendar', async () => {
    const response = await request(httpServer)
      .get(`/api/v1/technicians/${randomUUID()}/calendar`)
      .set('Cookie', authCookie(RoleCode.Admin))
      .expect(404);

    expect(response.body.error.code).toBe('TECHNICIAN_NOT_FOUND');
  });

  const windowBody = (startsAt: string, endsAt: string) => ({
    startsAt,
    endsAt,
    isAvailable: true,
  });

  const authCookie = (role: RoleCode, userId = randomUUID()): string => {
    const tokens = authTokenService.issueTokens({ sub: userId, roles: [role] });
    return `${ACCESS_TOKEN_COOKIE}=${tokens.accessToken}`;
  };

  const seedRows = async (): Promise<void> => {
    await dataSource.query(
      `
        INSERT INTO users (id, email, password_hash, full_name, is_active)
        VALUES
          ($1, $2, 'hash', 'Availability Technician', true),
          ($3, $4, 'hash', 'Other Availability Technician', true)
      `,
      [
        technicianUserId,
        `availability-technician-${testRunId}@example.com`,
        otherTechnicianUserId,
        `other-availability-technician-${testRunId}@example.com`,
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
      [[technicianUserId, otherTechnicianUserId]],
    );
    await dataSource.query(
      `INSERT INTO service_areas (id, code, name, is_active) VALUES ($1, $2, 'Availability Area', true)`,
      [serviceAreaId, `AVAILABILITY_AREA_${testRunId}`],
    );
    await dataSource.query(
      `
        INSERT INTO technicians (id, user_id, status, daily_assignment_limit)
        VALUES ($1, $2, 'active', 4), ($3, $4, 'active', 4)
      `,
      [technicianId, technicianUserId, otherTechnicianId, otherTechnicianUserId],
    );
    await dataSource.query(
      `
        INSERT INTO technician_service_areas (technician_id, service_area_id)
        VALUES ($1, $3), ($2, $3)
      `,
      [technicianId, otherTechnicianId, serviceAreaId],
    );
  };

  const cleanupRows = async (): Promise<void> => {
    const userIds = [technicianUserId, otherTechnicianUserId];
    await dataSource.query('DELETE FROM technicians WHERE id = ANY($1::uuid[])', [
      [technicianId, otherTechnicianId],
    ]);
    await dataSource.query('DELETE FROM user_roles WHERE user_id = ANY($1::uuid[])', [userIds]);
    await dataSource.query('DELETE FROM service_areas WHERE id = $1', [serviceAreaId]);
    await dataSource.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [userIds]);
  };
});
