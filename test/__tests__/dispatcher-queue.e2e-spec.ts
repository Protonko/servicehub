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
const categoryId = randomUUID();
const serviceTypeId = randomUUID();
const slaPolicyId = randomUUID();
const primaryAreaId = randomUUID();
const secondaryAreaId = randomUUID();
const primaryAddressId = randomUUID();
const secondaryAddressId = randomUUID();
const breachedRequestId = randomUUID();
const urgentRequestId = randomUUID();
const atRiskRequestId = randomUUID();
const assignedRequestId = randomUUID();
const completedRequestId = randomUUID();
const cancelledRequestId = randomUUID();
const failedRequestId = randomUUID();

describe('Dispatcher queue API', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authTokenService: AuthTokenService;
  let httpServer: Server;
  let assignedCompletionDeadline: Date;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    dataSource = app.get(DataSource);
    authTokenService = app.get<AuthTokenService>(AUTH_TOKEN_SERVICE);
    httpServer = app.getHttpServer() as Server;
    assignedCompletionDeadline = new Date(Date.now() + 6 * 60 * 60 * 1000);

    await cleanupRows();
    await seedRows();
  });

  afterAll(async () => {
    if (dataSource) await cleanupRows();
    if (app) await app.close();
  });

  it('returns active work in operational order with stable pagination metadata', async () => {
    const response = await request(httpServer)
      .get('/api/v1/dispatcher/queue')
      .query({ limit: 100, offset: 0 })
      .set('Cookie', authCookie(RoleCode.Dispatcher))
      .expect(200);

    expect(response.body.meta).toEqual({ limit: 100, offset: 0, total: 4 });
    expect(response.body.data.map((item: { id: string }) => item.id)).toEqual([
      breachedRequestId,
      urgentRequestId,
      atRiskRequestId,
      assignedRequestId,
    ]);
    expect(response.body.data[0]).toEqual(
      expect.objectContaining({
        id: breachedRequestId,
        slaState: 'breached',
        serviceArea: expect.objectContaining({ id: primaryAreaId }),
      }),
    );
    expect(response.body.data[3]).toEqual(
      expect.objectContaining({
        id: assignedRequestId,
        slaState: 'on_track',
        relevantDeadlineAt: assignedCompletionDeadline.toISOString(),
      }),
    );
  });

  it('applies SLA, priority, service area, and pagination filters before totals', async () => {
    const filtered = await request(httpServer)
      .get('/api/v1/dispatcher/queue')
      .query({
        priority: 'normal',
        serviceAreaId: secondaryAreaId,
        slaState: 'on_track',
        limit: 1,
        offset: 0,
      })
      .set('Cookie', authCookie(RoleCode.Admin))
      .expect(200);

    expect(filtered.body).toEqual({
      data: [expect.objectContaining({ id: assignedRequestId })],
      meta: { limit: 1, offset: 0, total: 1 },
    });

    const page = await request(httpServer)
      .get('/api/v1/dispatcher/queue')
      .query({ limit: 2, offset: 1 })
      .set('Cookie', authCookie(RoleCode.Dispatcher))
      .expect(200);

    expect(page.body.meta).toEqual({ limit: 2, offset: 1, total: 4 });
    expect(page.body.data).toHaveLength(2);
  });

  it('allows an explicit terminal status while excluding terminal rows by default', async () => {
    const completed = await request(httpServer)
      .get('/api/v1/dispatcher/queue')
      .query({ status: 'completed' })
      .set('Cookie', authCookie(RoleCode.Dispatcher))
      .expect(200);

    expect(completed.body).toEqual({
      data: [expect.objectContaining({ id: completedRequestId, status: 'completed' })],
      meta: { limit: 20, offset: 0, total: 1 },
    });

    const defaultQueue = await request(httpServer)
      .get('/api/v1/dispatcher/queue')
      .set('Cookie', authCookie(RoleCode.Dispatcher))
      .expect(200);
    const ids = defaultQueue.body.data.map((item: { id: string }) => item.id);

    expect(ids).not.toEqual(
      expect.arrayContaining([completedRequestId, cancelledRequestId, failedRequestId]),
    );
  });

  it('requires dispatcher or admin access', async () => {
    await request(httpServer).get('/api/v1/dispatcher/queue').expect(401);
    await request(httpServer)
      .get('/api/v1/dispatcher/queue')
      .set('Cookie', authCookie(RoleCode.Customer))
      .expect(403);
    await request(httpServer)
      .get('/api/v1/dispatcher/queue')
      .set('Cookie', authCookie(RoleCode.Technician))
      .expect(403);
  });

  it.each([
    ['status', 'unknown'],
    ['priority', 'unknown'],
    ['serviceAreaId', 'not-a-uuid'],
    ['slaState', 'unknown'],
    ['limit', '0'],
    ['limit', '101'],
    ['offset', '-1'],
    ['unexpected', 'value'],
  ])('rejects invalid %s query values', async (parameter, value) => {
    await request(httpServer)
      .get('/api/v1/dispatcher/queue')
      .query({ [parameter]: value })
      .set('Cookie', authCookie(RoleCode.Dispatcher))
      .expect(400);
  });

  const authCookie = (role: RoleCode): string => {
    const tokens = authTokenService.issueTokens({ sub: randomUUID(), roles: [role] });
    return `${ACCESS_TOKEN_COOKIE}=${tokens.accessToken}`;
  };

  const cleanupRows = async (): Promise<void> => {
    await dataSource.query('DELETE FROM service_requests WHERE id = ANY($1::uuid[])', [
      [
        breachedRequestId,
        urgentRequestId,
        atRiskRequestId,
        assignedRequestId,
        completedRequestId,
        cancelledRequestId,
        failedRequestId,
      ],
    ]);
    await dataSource.query('DELETE FROM customer_addresses WHERE id = ANY($1::uuid[])', [
      [primaryAddressId, secondaryAddressId],
    ]);
    await dataSource.query('DELETE FROM service_types WHERE id = $1', [serviceTypeId]);
    await dataSource.query('DELETE FROM sla_policies WHERE id = $1', [slaPolicyId]);
    await dataSource.query('DELETE FROM service_categories WHERE id = $1', [categoryId]);
    await dataSource.query('DELETE FROM service_areas WHERE id = ANY($1::uuid[])', [
      [primaryAreaId, secondaryAreaId],
    ]);
    await dataSource.query('DELETE FROM users WHERE id = $1', [customerId]);
  };

  const seedRows = async (): Promise<void> => {
    const now = Date.now();
    const iso = (offsetMinutes: number): string =>
      new Date(now + offsetMinutes * 60 * 1000).toISOString();

    await dataSource.query(
      `INSERT INTO users (id, email, password_hash, full_name, is_active)
       VALUES ($1, $2, 'hash', 'Dispatcher Queue Customer', true)`,
      [customerId, `dispatcher-queue-${testRunId}@example.com`],
    );
    await dataSource.query(
      `INSERT INTO service_categories (id, code, name, description, is_active)
       VALUES ($1, $2, 'Queue HVAC', null, true)`,
      [categoryId, `QUEUE_CATEGORY_${testRunId}`],
    );
    await dataSource.query(
      `INSERT INTO sla_policies (
         id, code, name, priority, assignment_deadline_minutes,
         completion_deadline_minutes, is_active
       ) VALUES ($1, $2, 'Queue SLA', 'normal', 60, 480, true)`,
      [slaPolicyId, `QUEUE_SLA_${testRunId}`],
    );
    await dataSource.query(
      `INSERT INTO service_types (
         id, category_id, sla_policy_id, code, name, default_priority,
         estimated_duration_minutes, is_other, is_active
       ) VALUES ($1, $2, $3, $4, 'Queue repair', 'normal', 60, false, true)`,
      [serviceTypeId, categoryId, slaPolicyId, `QUEUE_TYPE_${testRunId}`],
    );
    await dataSource.query(
      `INSERT INTO service_areas (id, code, name, is_active)
       VALUES ($1, $2, 'Queue Primary', true), ($3, $4, 'Queue Secondary', true)`,
      [
        primaryAreaId,
        `QUEUE_PRIMARY_${testRunId}`,
        secondaryAreaId,
        `QUEUE_SECONDARY_${testRunId}`,
      ],
    );
    await dataSource.query(
      `INSERT INTO customer_addresses (id, customer_id, service_area_id, line1, city)
       VALUES
         ($1, $2, $3, '1 Primary Street', 'Tbilisi'),
         ($4, $2, $5, '2 Secondary Street', 'Tbilisi')`,
      [primaryAddressId, customerId, primaryAreaId, secondaryAddressId, secondaryAreaId],
    );

    const rows = [
      [breachedRequestId, primaryAddressId, 'created', 'normal', iso(-10), iso(300)],
      [urgentRequestId, primaryAddressId, 'created', 'urgent', iso(240), iso(360)],
      [atRiskRequestId, primaryAddressId, 'created', 'high', iso(30), iso(300)],
      [
        assignedRequestId,
        secondaryAddressId,
        'assigned',
        'normal',
        iso(-120),
        assignedCompletionDeadline.toISOString(),
      ],
      [completedRequestId, primaryAddressId, 'completed', 'urgent', iso(-240), iso(-60)],
      [cancelledRequestId, primaryAddressId, 'cancelled', 'normal', iso(60), iso(240)],
      [failedRequestId, primaryAddressId, 'failed', 'high', iso(60), iso(240)],
    ];

    for (const [id, addressId, status, priority, assignmentDeadline, completionDeadline] of rows) {
      await dataSource.query(
        `INSERT INTO service_requests (
           id, customer_id, category_id, service_type_id, address_id, sla_policy_id,
           status, priority, description, preferred_start_at, preferred_end_at,
           estimated_duration_minutes, assignment_deadline_at, completion_deadline_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, 'Queue fixture', $9, $10, 60, $11, $12
         )`,
        [
          id,
          customerId,
          categoryId,
          serviceTypeId,
          addressId,
          slaPolicyId,
          status,
          priority,
          iso(1440),
          iso(1500),
          assignmentDeadline,
          completionDeadline,
        ],
      );
    }
  };
});
