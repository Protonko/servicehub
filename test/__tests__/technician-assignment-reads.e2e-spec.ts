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
const customerId = randomUUID();
const assignedByUserId = randomUUID();
const technicianUserId = randomUUID();
const otherTechnicianUserId = randomUUID();
const technicianWithoutProfileUserId = randomUUID();
const technicianId = randomUUID();
const otherTechnicianId = randomUUID();
const categoryId = randomUUID();
const serviceTypeId = randomUUID();
const slaPolicyId = randomUUID();
const areaId = randomUUID();
const addressId = randomUUID();

const requestIds = {
  early: randomUUID(),
  middle: randomUUID(),
  completed: randomUUID(),
  other: randomUUID(),
};

const assignmentIds = {
  early: randomUUID(),
  middle: randomUUID(),
  completed: randomUUID(),
  other: randomUUID(),
};

describe('Technician assignment reads API', () => {
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

  it('requires authentication and technician role', async () => {
    await request(httpServer).get(endpoint()).expect(401);

    for (const role of [RoleCode.Customer, RoleCode.Dispatcher, RoleCode.Admin]) {
      await request(httpServer)
        .get(endpoint())
        .set('Cookie', authCookie(randomUUID(), role))
        .expect(403);
    }
  });

  it('returns only the current technician assignments in schedule order', async () => {
    const response = await request(httpServer)
      .get(endpoint())
      .set('Cookie', authCookie(technicianUserId, RoleCode.Technician))
      .expect(200);

    expect(response.body.data.map((assignment: { id: string }) => assignment.id)).toEqual([
      assignmentIds.early,
      assignmentIds.middle,
      assignmentIds.completed,
    ]);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: assignmentIds.early,
          status: 'assigned',
          startsAt: '2026-07-10T09:00:00.000Z',
          endsAt: '2026-07-10T11:00:00.000Z',
          serviceRequest: expect.objectContaining({
            id: requestIds.early,
            description: 'Early technician assignment',
            category: {
              id: categoryId,
              code: `TECH_ASSIGN_CATEGORY_${testRunId}`,
              name: 'Reads Category',
            },
            serviceType: {
              id: serviceTypeId,
              code: `TECH_ASSIGN_TYPE_${testRunId}`,
              name: 'Reads Service',
              isOther: false,
            },
            address: { id: addressId, city: 'Tbilisi', line1: '1 Assignment Street' },
          }),
        }),
      ]),
    );
    expect(response.body.data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: assignmentIds.other })]),
    );
  });

  it('applies status and half-open date overlap filters', async () => {
    const completed = await request(httpServer)
      .get(endpoint())
      .query({ status: 'completed' })
      .set('Cookie', authCookie(technicianUserId, RoleCode.Technician))
      .expect(200);

    expect(completed.body.data).toEqual([
      expect.objectContaining({ id: assignmentIds.completed, status: 'completed' }),
    ]);

    const window = await request(httpServer)
      .get(endpoint())
      .query({ from: '2026-07-10T11:00:00.000Z', to: '2026-07-10T12:00:00.000Z' })
      .set('Cookie', authCookie(technicianUserId, RoleCode.Technician))
      .expect(200);

    expect(window.body.data).toEqual([
      expect.objectContaining({
        id: assignmentIds.middle,
        startsAt: '2026-07-10T10:30:00.000Z',
        endsAt: '2026-07-10T12:30:00.000Z',
      }),
    ]);
  });

  it('rejects invalid filters and missing technician profiles', async () => {
    await request(httpServer)
      .get(endpoint())
      .query({ status: 'unknown' })
      .set('Cookie', authCookie(technicianUserId, RoleCode.Technician))
      .expect(400);

    const invalidRange = await request(httpServer)
      .get(endpoint())
      .query({ from: '2026-07-10T12:00:00.000Z', to: '2026-07-10T12:00:00.000Z' })
      .set('Cookie', authCookie(technicianUserId, RoleCode.Technician))
      .expect(400);
    expect(invalidRange.body.error.code).toBe('TECHNICIAN_ASSIGNMENT_FILTER_INVALID');

    const missingProfile = await request(httpServer)
      .get(endpoint())
      .set('Cookie', authCookie(technicianWithoutProfileUserId, RoleCode.Technician))
      .expect(404);
    expect(missingProfile.body.error.code).toBe('TECHNICIAN_NOT_FOUND');
  });

  const endpoint = (): string => '/api/v1/technician/assignments';

  const authCookie = (userId: string, role: RoleCode): string => {
    const tokens = authTokenService.issueTokens({ sub: userId, roles: [role] });
    return `${ACCESS_TOKEN_COOKIE}=${tokens.accessToken}`;
  };

  const seedRows = async (): Promise<void> => {
    await dataSource.query(
      `
        INSERT INTO users (id, email, password_hash, full_name, is_active)
        VALUES ($1, $2, 'hash', 'Assignment Reads Customer', true),
               ($3, $4, 'hash', 'Assignment Reads Dispatcher', true),
               ($5, $6, 'hash', 'Assignment Reads Technician', true),
               ($7, $8, 'hash', 'Other Assignment Reads Technician', true),
               ($9, $10, 'hash', 'No Profile Technician', true)
      `,
      [
        customerId,
        `assignment-reads-customer-${testRunId}@example.com`,
        assignedByUserId,
        `assignment-reads-dispatcher-${testRunId}@example.com`,
        technicianUserId,
        `assignment-reads-technician-${testRunId}@example.com`,
        otherTechnicianUserId,
        `assignment-reads-other-technician-${testRunId}@example.com`,
        technicianWithoutProfileUserId,
        `assignment-reads-no-profile-${testRunId}@example.com`,
      ],
    );
    await dataSource.query(
      `INSERT INTO service_categories (id, code, name, is_active) VALUES ($1, $2, 'Reads Category', true)`,
      [categoryId, `TECH_ASSIGN_CATEGORY_${testRunId}`],
    );
    await dataSource.query(
      `
        INSERT INTO sla_policies (
          id, code, name, priority, assignment_deadline_minutes,
          completion_deadline_minutes, is_active
        )
        VALUES ($1, $2, 'Reads SLA', 'normal', 60, 240, true)
      `,
      [slaPolicyId, `TECH_ASSIGN_SLA_${testRunId}`],
    );
    await dataSource.query(
      `
        INSERT INTO service_types (
          id, category_id, sla_policy_id, code, name, default_priority,
          estimated_duration_minutes, is_other, is_active
        )
        VALUES ($1, $2, $3, $4, 'Reads Service', 'normal', 120, false, true)
      `,
      [serviceTypeId, categoryId, slaPolicyId, `TECH_ASSIGN_TYPE_${testRunId}`],
    );
    await dataSource.query(
      `INSERT INTO service_areas (id, code, name, is_active) VALUES ($1, $2, 'Reads Area', true)`,
      [areaId, `TECH_ASSIGN_AREA_${testRunId}`],
    );
    await dataSource.query(
      `INSERT INTO customer_addresses (id, customer_id, service_area_id, line1, city)
       VALUES ($1, $2, $3, '1 Assignment Street', 'Tbilisi')`,
      [addressId, customerId, areaId],
    );
    await dataSource.query(
      `
        INSERT INTO technicians (id, user_id, status, daily_assignment_limit, rating)
        VALUES ($1, $2, 'active', 4, 4.5), ($3, $4, 'active', 4, 4.5)
      `,
      [technicianId, technicianUserId, otherTechnicianId, otherTechnicianUserId],
    );
    await dataSource.query(
      `
        INSERT INTO technician_service_areas (technician_id, service_area_id)
        VALUES ($1, $2), ($3, $2)
      `,
      [technicianId, areaId, otherTechnicianId],
    );

    await seedRequests();
    await seedAssignments();
  };

  const seedRequests = async (): Promise<void> => {
    const rows = [
      [requestIds.early, 'assigned', 'normal', 'Early technician assignment'],
      [requestIds.middle, 'assigned', 'high', 'Middle technician assignment'],
      [requestIds.completed, 'completed', 'normal', 'Completed technician assignment'],
      [requestIds.other, 'assigned', 'normal', 'Other technician assignment'],
    ];

    for (const [id, status, priority, description] of rows) {
      await dataSource.query(
        `
          INSERT INTO service_requests (
            id, customer_id, category_id, service_type_id, address_id, sla_policy_id,
            status, priority, description, preferred_start_at, preferred_end_at,
            estimated_duration_minutes, assignment_deadline_at, completion_deadline_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            '2026-07-10T09:00:00Z', '2026-07-10T13:00:00Z', 120,
            '2026-07-10T08:00:00Z', '2026-07-10T18:00:00Z'
          )
        `,
        [
          id,
          customerId,
          categoryId,
          serviceTypeId,
          addressId,
          slaPolicyId,
          status,
          priority,
          description,
        ],
      );
    }
  };

  const seedAssignments = async (): Promise<void> => {
    const rows = [
      [
        assignmentIds.early,
        requestIds.early,
        technicianId,
        'assigned',
        '2026-07-10T09:00:00Z',
        '2026-07-10T11:00:00Z',
      ],
      [
        assignmentIds.middle,
        requestIds.middle,
        technicianId,
        'accepted',
        '2026-07-10T10:30:00Z',
        '2026-07-10T12:30:00Z',
      ],
      [
        assignmentIds.completed,
        requestIds.completed,
        technicianId,
        'completed',
        '2026-07-11T09:00:00Z',
        '2026-07-11T10:00:00Z',
      ],
      [
        assignmentIds.other,
        requestIds.other,
        otherTechnicianId,
        'assigned',
        '2026-07-10T12:00:00Z',
        '2026-07-10T13:00:00Z',
      ],
    ];

    for (const [id, requestId, targetTechnicianId, status, startsAt, endsAt] of rows) {
      await dataSource.query(
        `
          INSERT INTO assignments (
            id, service_request_id, technician_id, assigned_by_user_id,
            status, starts_at, ends_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [id, requestId, targetTechnicianId, assignedByUserId, status, startsAt, endsAt],
      );
    }
  };

  const cleanupRows = async (): Promise<void> => {
    const userIds = [
      customerId,
      assignedByUserId,
      technicianUserId,
      otherTechnicianUserId,
      technicianWithoutProfileUserId,
    ];

    await dataSource.query('DELETE FROM assignments WHERE id = ANY($1::uuid[])', [
      Object.values(assignmentIds),
    ]);
    await dataSource.query('DELETE FROM service_requests WHERE id = ANY($1::uuid[])', [
      Object.values(requestIds),
    ]);
    await dataSource.query('DELETE FROM technicians WHERE id = ANY($1::uuid[])', [
      [technicianId, otherTechnicianId],
    ]);
    await dataSource.query('DELETE FROM customer_addresses WHERE id = $1', [addressId]);
    await dataSource.query('DELETE FROM service_types WHERE id = $1', [serviceTypeId]);
    await dataSource.query('DELETE FROM sla_policies WHERE id = $1', [slaPolicyId]);
    await dataSource.query('DELETE FROM service_categories WHERE id = $1', [categoryId]);
    await dataSource.query('DELETE FROM service_areas WHERE id = $1', [areaId]);
    await dataSource.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [userIds]);
  };
});
