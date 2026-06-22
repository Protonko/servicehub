import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { ACCESS_TOKEN_COOKIE } from '@application/auth';
import { AUTH_TOKEN_SERVICE, AuthTokenService } from '@contract/auth';
import { RoleCode } from '@domain/model';
import { RequestPriority } from '@domain/model';
import { SERVICE_REQUEST_REPOSITORY, ServiceRequestRepository } from '@domain/repositories';
import { AppModule } from '../../src/app.module';

jest.setTimeout(30000);

const testRunId = randomUUID().replaceAll('-', '').slice(0, 12);
const dispatcherId = randomUUID();
const adminId = randomUUID();
const customerId = randomUUID();
const categoryId = randomUUID();
const otherCategoryId = randomUUID();
const oldSlaPolicyId = randomUUID();
const targetSlaPolicyId = randomUUID();
const oldOtherTypeId = randomUUID();
const targetTypeId = randomUUID();
const mismatchedTypeId = randomUUID();
const oldSkillId = randomUUID();
const targetSkillId = randomUUID();
const serviceAreaId = randomUUID();
const addressId = randomUUID();
const dispatcherRequestId = randomUUID();
const adminRequestId = randomUUID();
const otherTargetRequestId = randomUUID();
const mismatchRequestId = randomUUID();
const rollbackRequestId = randomUUID();
const concurrentRequestId = randomUUID();
const createdAt = new Date('2026-06-20T09:00:00.000Z');
const requestIds = [
  dispatcherRequestId,
  adminRequestId,
  otherTargetRequestId,
  mismatchRequestId,
  rollbackRequestId,
  concurrentRequestId,
];

describe('Triage service request API', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authTokenService: AuthTokenService;
  let httpServer: Server;
  let serviceRequestRepository: ServiceRequestRepository;

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
    serviceRequestRepository = app.get<ServiceRequestRepository>(SERVICE_REQUEST_REPOSITORY);

    await cleanupRows();
    await seedRows();
  });

  afterAll(async () => {
    if (dataSource) await cleanupRows();
    if (app) await app.close();
  });

  it('triages atomically with replacement skills, audit, outbox, and continuous SLA time', async () => {
    const response = await request(httpServer)
      .patch(`/api/v1/service-requests/${dispatcherRequestId}/triage`)
      .set('Cookie', authCookie(dispatcherId, RoleCode.Dispatcher))
      .send(triageBody())
      .expect(200);

    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: dispatcherRequestId,
        categoryId,
        serviceTypeId: targetTypeId,
        slaPolicyId: targetSlaPolicyId,
        status: 'triaged',
        priority: 'high',
        estimatedDurationMinutes: 120,
        assignmentDeadlineAt: '2026-06-20T10:30:00.000Z',
        completionDeadlineAt: '2026-06-20T19:00:00.000Z',
        requiredSkillIds: [targetSkillId],
      }),
    );

    const [persisted] = await dataSource.query(
      `SELECT category_id, service_type_id, sla_policy_id, status, priority,
              estimated_duration_minutes, assignment_deadline_at, completion_deadline_at,
              triaged_at
       FROM service_requests WHERE id = $1`,
      [dispatcherRequestId],
    );
    expect(persisted).toEqual(
      expect.objectContaining({
        category_id: categoryId,
        service_type_id: targetTypeId,
        sla_policy_id: targetSlaPolicyId,
        status: 'triaged',
        priority: 'high',
        estimated_duration_minutes: 120,
      }),
    );
    expect((persisted?.assignment_deadline_at as Date).toISOString()).toBe(
      '2026-06-20T10:30:00.000Z',
    );
    expect((persisted?.completion_deadline_at as Date).toISOString()).toBe(
      '2026-06-20T19:00:00.000Z',
    );
    expect(persisted?.triaged_at).toBeInstanceOf(Date);

    const skills = await dataSource.query(
      `SELECT skill_id FROM service_request_required_skills WHERE service_request_id = $1`,
      [dispatcherRequestId],
    );
    expect(skills).toEqual([{ skill_id: targetSkillId }]);

    const [audit] = await dataSource.query(
      `SELECT actor_user_id, action, old_value, new_value
       FROM audit_logs WHERE entity_id = $1 AND action = 'ServiceRequestTriaged'`,
      [dispatcherRequestId],
    );
    expect(audit).toEqual(
      expect.objectContaining({
        actor_user_id: dispatcherId,
        action: 'ServiceRequestTriaged',
        old_value: expect.objectContaining({ requiredSkillIds: [oldSkillId] }),
        new_value: expect.objectContaining({ requiredSkillIds: [targetSkillId] }),
      }),
    );

    const [outbox] = await dataSource.query(
      `SELECT event_type, status, payload
       FROM outbox_events WHERE aggregate_id = $1 AND event_type = 'ServiceRequestTriaged'`,
      [dispatcherRequestId],
    );
    expect(outbox).toEqual(
      expect.objectContaining({
        event_type: 'ServiceRequestTriaged',
        status: 'pending',
        payload: expect.objectContaining({
          requestId: dispatcherRequestId,
          requiredSkillIds: [targetSkillId],
        }),
      }),
    );
  });

  it('allows an admin to triage a created request', async () => {
    await request(httpServer)
      .patch(`/api/v1/service-requests/${adminRequestId}/triage`)
      .set('Cookie', authCookie(adminId, RoleCode.Admin))
      .send(triageBody({ requiredSkillIds: [] }))
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toEqual(
          expect.objectContaining({ id: adminRequestId, status: 'triaged', requiredSkillIds: [] }),
        );
      });
  });

  it('requires dispatcher or admin access', async () => {
    await request(httpServer)
      .patch(`/api/v1/service-requests/${otherTargetRequestId}/triage`)
      .send(triageBody())
      .expect(401);
    await request(httpServer)
      .patch(`/api/v1/service-requests/${otherTargetRequestId}/triage`)
      .set('Cookie', authCookie(randomUUID(), RoleCode.Customer))
      .send(triageBody())
      .expect(403);
    await request(httpServer)
      .patch(`/api/v1/service-requests/${otherTargetRequestId}/triage`)
      .set('Cookie', authCookie(randomUUID(), RoleCode.Technician))
      .send(triageBody())
      .expect(403);
  });

  it('rejects Other, category mismatch, and repeated triage without partial writes', async () => {
    await request(httpServer)
      .patch(`/api/v1/service-requests/${otherTargetRequestId}/triage`)
      .set('Cookie', authCookie(dispatcherId, RoleCode.Dispatcher))
      .send(triageBody({ serviceTypeId: oldOtherTypeId }))
      .expect(409);
    await request(httpServer)
      .patch(`/api/v1/service-requests/${mismatchRequestId}/triage`)
      .set('Cookie', authCookie(dispatcherId, RoleCode.Dispatcher))
      .send(triageBody({ serviceTypeId: mismatchedTypeId }))
      .expect(409);
    await request(httpServer)
      .patch(`/api/v1/service-requests/${dispatcherRequestId}/triage`)
      .set('Cookie', authCookie(dispatcherId, RoleCode.Dispatcher))
      .send(triageBody())
      .expect(409);

    const unchanged = await dataSource.query(
      `SELECT id, status, service_type_id FROM service_requests WHERE id = ANY($1::uuid[])`,
      [[otherTargetRequestId, mismatchRequestId]],
    );
    expect(unchanged).toEqual(
      expect.arrayContaining([
        { id: otherTargetRequestId, status: 'needs_triage', service_type_id: oldOtherTypeId },
        { id: mismatchRequestId, status: 'needs_triage', service_type_id: oldOtherTypeId },
      ]),
    );
    const [{ count }] = await dataSource.query(
      `SELECT count(*)::int AS count FROM outbox_events
       WHERE aggregate_id = ANY($1::uuid[]) AND event_type = 'ServiceRequestTriaged'`,
      [[otherTargetRequestId, mismatchRequestId]],
    );
    expect(count).toBe(0);
  });

  it('rejects invalid DTOs and missing resources', async () => {
    await request(httpServer)
      .patch(`/api/v1/service-requests/${otherTargetRequestId}/triage`)
      .set('Cookie', authCookie(dispatcherId, RoleCode.Dispatcher))
      .send(triageBody({ estimatedDurationMinutes: 0, unexpected: true }))
      .expect(400);
    await request(httpServer)
      .patch(`/api/v1/service-requests/${randomUUID()}/triage`)
      .set('Cookie', authCookie(dispatcherId, RoleCode.Dispatcher))
      .send(triageBody())
      .expect(404);
  });

  it('rolls back request and skill changes when a late audit write fails', async () => {
    const current = await serviceRequestRepository.findById(rollbackRequestId);
    expect(current).not.toBeNull();
    const triaged = current!.triage({
      categoryId,
      serviceTypeId: targetTypeId,
      slaPolicyId: targetSlaPolicyId,
      priority: RequestPriority.High,
      estimatedDurationMinutes: 120,
      assignmentDeadlineAt: new Date('2026-06-20T10:30:00.000Z'),
      completionDeadlineAt: new Date('2026-06-20T19:00:00.000Z'),
    });

    await expect(
      serviceRequestRepository.triage({
        request: triaged,
        expectedStatus: current!.status,
        requiredSkillIds: [targetSkillId],
        actorUserId: randomUUID(),
      }),
    ).rejects.toThrow();

    const [persisted] = await dataSource.query(
      `SELECT status, service_type_id FROM service_requests WHERE id = $1`,
      [rollbackRequestId],
    );
    expect(persisted).toEqual({ status: 'needs_triage', service_type_id: oldOtherTypeId });
    const skills = await dataSource.query(
      `SELECT skill_id FROM service_request_required_skills WHERE service_request_id = $1`,
      [rollbackRequestId],
    );
    expect(skills).toEqual([{ skill_id: oldSkillId }]);
  });

  it('allows only one of two concurrent triage transactions to commit', async () => {
    const current = await serviceRequestRepository.findById(concurrentRequestId);
    expect(current).not.toBeNull();
    const triaged = current!.triage({
      categoryId,
      serviceTypeId: targetTypeId,
      slaPolicyId: targetSlaPolicyId,
      priority: RequestPriority.High,
      estimatedDurationMinutes: 120,
      assignmentDeadlineAt: new Date('2026-06-20T10:30:00.000Z'),
      completionDeadlineAt: new Date('2026-06-20T19:00:00.000Z'),
    });
    const persistenceInput = {
      request: triaged,
      expectedStatus: current!.status,
      requiredSkillIds: [targetSkillId],
      actorUserId: dispatcherId,
    };

    const outcomes = await Promise.allSettled([
      serviceRequestRepository.triage(persistenceInput),
      serviceRequestRepository.triage(persistenceInput),
    ]);

    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
    const [{ count }] = await dataSource.query(
      `SELECT count(*)::int AS count FROM outbox_events
       WHERE aggregate_id = $1 AND event_type = 'ServiceRequestTriaged'`,
      [concurrentRequestId],
    );
    expect(count).toBe(1);
  });

  const triageBody = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    categoryId,
    serviceTypeId: targetTypeId,
    priority: 'high',
    estimatedDurationMinutes: 120,
    requiredSkillIds: [targetSkillId],
    ...overrides,
  });

  const authCookie = (userId: string, role: RoleCode): string => {
    const tokens = authTokenService.issueTokens({ sub: userId, roles: [role] });
    return `${ACCESS_TOKEN_COOKIE}=${tokens.accessToken}`;
  };

  const cleanupRows = async (): Promise<void> => {
    await dataSource.query('DELETE FROM outbox_events WHERE aggregate_id = ANY($1::uuid[])', [
      requestIds,
    ]);
    await dataSource.query('DELETE FROM audit_logs WHERE entity_id = ANY($1::uuid[])', [
      requestIds,
    ]);
    await dataSource.query(
      'DELETE FROM service_request_required_skills WHERE service_request_id = ANY($1::uuid[])',
      [requestIds],
    );
    await dataSource.query('DELETE FROM service_requests WHERE id = ANY($1::uuid[])', [requestIds]);
    await dataSource.query('DELETE FROM customer_addresses WHERE id = $1', [addressId]);
    await dataSource.query('DELETE FROM service_types WHERE id = ANY($1::uuid[])', [
      [oldOtherTypeId, targetTypeId, mismatchedTypeId],
    ]);
    await dataSource.query('DELETE FROM skills WHERE id = ANY($1::uuid[])', [
      [oldSkillId, targetSkillId],
    ]);
    await dataSource.query('DELETE FROM sla_policies WHERE id = ANY($1::uuid[])', [
      [oldSlaPolicyId, targetSlaPolicyId],
    ]);
    await dataSource.query('DELETE FROM service_categories WHERE id = ANY($1::uuid[])', [
      [categoryId, otherCategoryId],
    ]);
    await dataSource.query('DELETE FROM service_areas WHERE id = $1', [serviceAreaId]);
    await dataSource.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [
      [dispatcherId, adminId, customerId],
    ]);
  };

  const seedRows = async (): Promise<void> => {
    await dataSource.query(
      `INSERT INTO users (id, email, password_hash, full_name, is_active) VALUES
       ($1, $2, 'hash', 'Triage Dispatcher', true),
       ($3, $4, 'hash', 'Triage Admin', true),
       ($5, $6, 'hash', 'Triage Customer', true)`,
      [
        dispatcherId,
        `triage-dispatcher-${testRunId}@example.com`,
        adminId,
        `triage-admin-${testRunId}@example.com`,
        customerId,
        `triage-customer-${testRunId}@example.com`,
      ],
    );
    await dataSource.query(
      `INSERT INTO service_categories (id, code, name, is_active) VALUES
       ($1, $2, 'Triage HVAC', true), ($3, $4, 'Triage Electrical', true)`,
      [categoryId, `TRIAGE_HVAC_${testRunId}`, otherCategoryId, `TRIAGE_ELEC_${testRunId}`],
    );
    await dataSource.query(
      `INSERT INTO sla_policies (
         id, code, name, priority, assignment_deadline_minutes,
         completion_deadline_minutes, is_active
       ) VALUES
       ($1, $2, 'Old Triage SLA', 'normal', 60, 480, true),
       ($3, $4, 'Target Triage SLA', 'high', 90, 600, true)`,
      [oldSlaPolicyId, `TRIAGE_OLD_${testRunId}`, targetSlaPolicyId, `TRIAGE_NEW_${testRunId}`],
    );
    await dataSource.query(
      `INSERT INTO skills (id, code, name, is_active) VALUES
       ($1, $2, 'Old triage skill', true), ($3, $4, 'Target triage skill', true)`,
      [oldSkillId, `TRIAGE_OLD_SKILL_${testRunId}`, targetSkillId, `TRIAGE_SKILL_${testRunId}`],
    );
    await dataSource.query(
      `INSERT INTO service_types (
         id, category_id, sla_policy_id, code, name, default_priority,
         estimated_duration_minutes, is_other, is_active
       ) VALUES
       ($1, $2, $3, $4, 'Other triage issue', 'normal', 60, true, true),
       ($5, $2, $6, $7, 'Classified repair', 'high', 120, false, true),
       ($8, $9, $6, $10, 'Mismatched repair', 'high', 120, false, true)`,
      [
        oldOtherTypeId,
        categoryId,
        oldSlaPolicyId,
        `TRIAGE_OTHER_${testRunId}`,
        targetTypeId,
        targetSlaPolicyId,
        `TRIAGE_REPAIR_${testRunId}`,
        mismatchedTypeId,
        otherCategoryId,
        `TRIAGE_MISMATCH_${testRunId}`,
      ],
    );
    await dataSource.query(
      `INSERT INTO service_areas (id, code, name, is_active)
       VALUES ($1, $2, 'Triage Area', true)`,
      [serviceAreaId, `TRIAGE_AREA_${testRunId}`],
    );
    await dataSource.query(
      `INSERT INTO customer_addresses (id, customer_id, service_area_id, line1, city)
       VALUES ($1, $2, $3, '15 Triage Street', 'Tbilisi')`,
      [addressId, customerId, serviceAreaId],
    );

    for (const [id, status] of [
      [dispatcherRequestId, 'needs_triage'],
      [adminRequestId, 'created'],
      [otherTargetRequestId, 'needs_triage'],
      [mismatchRequestId, 'needs_triage'],
      [rollbackRequestId, 'needs_triage'],
      [concurrentRequestId, 'needs_triage'],
    ]) {
      await dataSource.query(
        `INSERT INTO service_requests (
           id, customer_id, category_id, service_type_id, address_id, sla_policy_id,
           status, priority, description, preferred_start_at, preferred_end_at,
           estimated_duration_minutes, assignment_deadline_at, completion_deadline_at,
           created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, 'normal', 'Unknown fault',
           '2026-06-21T10:00:00.000Z', '2026-06-21T12:00:00.000Z', 60,
           '2026-06-20T10:00:00.000Z', '2026-06-20T17:00:00.000Z', $8, $8
         )`,
        [id, customerId, categoryId, oldOtherTypeId, addressId, oldSlaPolicyId, status, createdAt],
      );
      await dataSource.query(
        `INSERT INTO service_request_required_skills (service_request_id, skill_id)
         VALUES ($1, $2)`,
        [id, oldSkillId],
      );
    }
  };
});
