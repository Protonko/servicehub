import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { ACCESS_TOKEN_COOKIE } from '@application/auth';
import { AssignTechnicianUseCase } from '@application/use-cases';
import { AUTH_TOKEN_SERVICE, AuthTokenService } from '@contract/auth';
import { RoleCode } from '@domain/model';
import { AppModule } from '../../src/app.module';

jest.setTimeout(30000);

const testRunId = randomUUID().replaceAll('-', '').slice(0, 12);
const selectedStartsAt = '2026-07-10T09:00:00.000Z';
const selectedEndsAt = '2026-07-10T11:00:00.000Z';
const customerId = randomUUID();
const dispatcherId = randomUUID();
const adminId = randomUUID();
const categoryId = randomUUID();
const serviceTypeId = randomUUID();
const slaPolicyId = randomUUID();
const areaId = randomUUID();
const otherAreaId = randomUUID();
const addressId = randomUUID();
const skillIds = [randomUUID(), randomUUID()];

const requestIds = {
  dispatcher: randomUUID(),
  admin: randomUUID(),
  invalidCandidate: randomUUID(),
  needsTriage: randomUUID(),
  adjacency: randomUUID(),
  overlapSource: randomUUID(),
  concurrencyOne: randomUUID(),
  concurrencyTwo: randomUUID(),
  sameRequest: randomUUID(),
  rollback: randomUUID(),
};

const technicians = {
  dispatcher: technician('dispatcher'),
  admin: technician('admin'),
  inactive: technician('inactive'),
  missingSkill: technician('missing-skill'),
  wrongArea: technician('wrong-area'),
  unavailable: technician('unavailable'),
  blocked: technician('blocked'),
  overlapping: technician('overlapping'),
  adjacent: technician('adjacent'),
  concurrency: technician('concurrency'),
  sameRequestOne: technician('same-request-one'),
  sameRequestTwo: technician('same-request-two'),
  rollback: technician('rollback'),
};

describe('Assign technician transaction API', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authTokenService: AuthTokenService;
  let assignTechnicianUseCase: AssignTechnicianUseCase;
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
    assignTechnicianUseCase = app.get(AssignTechnicianUseCase);
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

  it('requires authentication and dispatcher/admin role', async () => {
    await request(httpServer)
      .post(endpoint(requestIds.dispatcher))
      .send(body(technicians.dispatcher.id))
      .expect(401);

    for (const role of [RoleCode.Customer, RoleCode.Technician]) {
      await request(httpServer)
        .post(endpoint(requestIds.dispatcher))
        .set('Cookie', authCookie(randomUUID(), role))
        .send(body(technicians.dispatcher.id))
        .expect(403);
    }
  });

  it.each([
    [RoleCode.Dispatcher, dispatcherId, requestIds.dispatcher, technicians.dispatcher.id],
    [RoleCode.Admin, adminId, requestIds.admin, technicians.admin.id],
  ] as const)('assigns transactionally for %s', async (role, actorId, requestId, technicianId) => {
    const response = await request(httpServer)
      .post(endpoint(requestId))
      .set('Cookie', authCookie(actorId, role))
      .send(body(technicianId))
      .expect(201);

    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        serviceRequestId: requestId,
        technicianId,
        assignedByUserId: actorId,
        status: 'assigned',
        startsAt: selectedStartsAt,
        endsAt: selectedEndsAt,
      }),
    );

    const [requestRows, assignmentRows, auditRows, outboxRows] = await Promise.all([
      dataSource.query<Array<{ status: string; assigned_at: Date }>>(
        `SELECT status, assigned_at FROM service_requests WHERE id = $1`,
        [requestId],
      ),
      dataSource.query<Array<{ id: string }>>(
        `SELECT id FROM assignments WHERE service_request_id = $1`,
        [requestId],
      ),
      dataSource.query<Array<{ action: string }>>(
        `SELECT action FROM audit_logs WHERE entity_id = $1 AND action = 'TechnicianAssigned'`,
        [requestId],
      ),
      dataSource.query<Array<{ event_type: string; status: string }>>(
        `SELECT event_type, status FROM outbox_events WHERE aggregate_id = $1 AND event_type = 'TechnicianAssigned'`,
        [requestId],
      ),
    ]);

    expect(requestRows[0]).toEqual(
      expect.objectContaining({ status: 'assigned', assigned_at: expect.any(Date) }),
    );
    expect(assignmentRows).toHaveLength(1);
    expect(auditRows).toEqual([{ action: 'TechnicianAssigned' }]);
    expect(outboxRows).toEqual([{ event_type: 'TechnicianAssigned', status: 'pending' }]);
  });

  it('returns validation and resource errors', async () => {
    await request(httpServer)
      .post(endpoint(requestIds.invalidCandidate))
      .set('Cookie', authCookie(dispatcherId, RoleCode.Dispatcher))
      .send({ ...body(technicians.dispatcher.id), technicianId: 'invalid' })
      .expect(400);

    const reversed = await request(httpServer)
      .post(endpoint(requestIds.invalidCandidate))
      .set('Cookie', authCookie(dispatcherId, RoleCode.Dispatcher))
      .send({
        technicianId: technicians.dispatcher.id,
        startsAt: selectedEndsAt,
        endsAt: selectedStartsAt,
      })
      .expect(400);
    expect(reversed.body.error.code).toBe('ASSIGNMENT_TIME_SLOT_INVALID');

    const missingRequest = await request(httpServer)
      .post(endpoint(randomUUID()))
      .set('Cookie', authCookie(dispatcherId, RoleCode.Dispatcher))
      .send(body(technicians.dispatcher.id))
      .expect(404);
    expect(missingRequest.body.error.code).toBe('ASSIGNMENT_RESOURCE_NOT_FOUND');

    const missingTechnician = await request(httpServer)
      .post(endpoint(requestIds.invalidCandidate))
      .set('Cookie', authCookie(dispatcherId, RoleCode.Dispatcher))
      .send(body(randomUUID()))
      .expect(404);
    expect(missingTechnician.body.error.code).toBe('ASSIGNMENT_RESOURCE_NOT_FOUND');
  });

  it('rejects a request that still needs triage', async () => {
    const response = await assign(requestIds.needsTriage, technicians.dispatcher.id).expect(409);
    expect(response.body.error.code).toBe('ASSIGNMENT_CONFLICT');
  });

  it.each([
    ['inactive', technicians.inactive.id],
    ['missing skill', technicians.missingSkill.id],
    ['wrong area', technicians.wrongArea.id],
    ['outside availability', technicians.unavailable.id],
    ['blocked', technicians.blocked.id],
    ['overlapping assignment', technicians.overlapping.id],
  ])('rejects an ineligible technician: %s', async (_case, technicianId) => {
    const response = await assign(requestIds.invalidCandidate, technicianId).expect(409);
    expect(response.body.error.code).toBe('ASSIGNMENT_CONFLICT');
  });

  it('allows adjacent active and overlapping terminal assignments', async () => {
    await assign(requestIds.adjacency, technicians.adjacent.id).expect(201);
  });

  it('serializes concurrent overlapping assignments for one technician', async () => {
    const responses = await Promise.all([
      assign(requestIds.concurrencyOne, technicians.concurrency.id),
      assign(requestIds.concurrencyTwo, technicians.concurrency.id),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const rows = await dataSource.query<Array<{ count: string }>>(
      `SELECT COUNT(*)::text AS count FROM assignments WHERE technician_id = $1 AND status = 'assigned'`,
      [technicians.concurrency.id],
    );
    expect(rows[0]?.count).toBe('1');
  });

  it('serializes competing assignments for one request', async () => {
    const responses = await Promise.all([
      assign(requestIds.sameRequest, technicians.sameRequestOne.id),
      assign(requestIds.sameRequest, technicians.sameRequestTwo.id),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const rows = await dataSource.query<Array<{ count: string }>>(
      `SELECT COUNT(*)::text AS count FROM assignments WHERE service_request_id = $1`,
      [requestIds.sameRequest],
    );
    expect(rows[0]?.count).toBe('1');
  });

  it('rolls back request, assignment, audit, and outbox when persistence fails', async () => {
    await expect(
      assignTechnicianUseCase.execute({
        actor: { userId: randomUUID(), roles: [RoleCode.Dispatcher] },
        requestId: requestIds.rollback,
        technicianId: technicians.rollback.id,
        startsAt: new Date(selectedStartsAt),
        endsAt: new Date(selectedEndsAt),
      }),
    ).rejects.toBeDefined();

    const [requestRows, assignmentRows, auditRows, outboxRows] = await Promise.all([
      dataSource.query<Array<{ status: string; assigned_at: Date | null }>>(
        `SELECT status, assigned_at FROM service_requests WHERE id = $1`,
        [requestIds.rollback],
      ),
      dataSource.query<Array<{ count: string }>>(
        `SELECT COUNT(*)::text AS count FROM assignments WHERE service_request_id = $1`,
        [requestIds.rollback],
      ),
      dataSource.query<Array<{ count: string }>>(
        `SELECT COUNT(*)::text AS count FROM audit_logs WHERE entity_id = $1 AND action = 'TechnicianAssigned'`,
        [requestIds.rollback],
      ),
      dataSource.query<Array<{ count: string }>>(
        `SELECT COUNT(*)::text AS count FROM outbox_events WHERE aggregate_id = $1 AND event_type = 'TechnicianAssigned'`,
        [requestIds.rollback],
      ),
    ]);

    expect(requestRows[0]).toEqual({ status: 'created', assigned_at: null });
    expect(assignmentRows[0]?.count).toBe('0');
    expect(auditRows[0]?.count).toBe('0');
    expect(outboxRows[0]?.count).toBe('0');
  });

  const assign = (requestId: string, technicianId: string) =>
    request(httpServer)
      .post(endpoint(requestId))
      .set('Cookie', authCookie(dispatcherId, RoleCode.Dispatcher))
      .send(body(technicianId));

  const authCookie = (userId: string, role: RoleCode): string => {
    const tokens = authTokenService.issueTokens({ sub: userId, roles: [role] });
    return `${ACCESS_TOKEN_COOKIE}=${tokens.accessToken}`;
  };

  const seedRows = async (): Promise<void> => {
    await seedUsers();
    await seedCatalogAndLocation();
    await seedRequests();
    await seedTechnicians();
    await seedExistingAssignments();
  };

  const seedUsers = async (): Promise<void> => {
    await dataSource.query(
      `
        INSERT INTO users (id, email, password_hash, full_name, is_active)
        VALUES ($1, $2, 'hash', 'Assignment Customer', true),
               ($3, $4, 'hash', 'Assignment Dispatcher', true),
               ($5, $6, 'hash', 'Assignment Admin', true)
      `,
      [
        customerId,
        `assignment-customer-${testRunId}@example.com`,
        dispatcherId,
        `assignment-dispatcher-${testRunId}@example.com`,
        adminId,
        `assignment-admin-${testRunId}@example.com`,
      ],
    );

    for (const [index, fixture] of Object.values(technicians).entries()) {
      await dataSource.query(
        `INSERT INTO users (id, email, password_hash, full_name, is_active) VALUES ($1, $2, 'hash', $3, true)`,
        [
          fixture.userId,
          `assignment-tech-${index}-${testRunId}@example.com`,
          `Assignment Technician ${index}`,
        ],
      );
    }
  };

  const seedCatalogAndLocation = async (): Promise<void> => {
    await dataSource.query(
      `INSERT INTO service_categories (id, code, name, is_active) VALUES ($1, $2, 'Assignment Category', true)`,
      [categoryId, `ASSIGNMENT_CATEGORY_${testRunId}`],
    );
    await dataSource.query(
      `
        INSERT INTO skills (id, code, name, is_active)
        VALUES ($1, $2, 'Assignment Skill One', true),
               ($3, $4, 'Assignment Skill Two', true)
      `,
      [
        skillIds[0],
        `ASSIGNMENT_SKILL_ONE_${testRunId}`,
        skillIds[1],
        `ASSIGNMENT_SKILL_TWO_${testRunId}`,
      ],
    );
    await dataSource.query(
      `
        INSERT INTO sla_policies (
          id, code, name, priority, assignment_deadline_minutes,
          completion_deadline_minutes, is_active
        ) VALUES ($1, $2, 'Assignment SLA', 'normal', 60, 240, true)
      `,
      [slaPolicyId, `ASSIGNMENT_SLA_${testRunId}`],
    );
    await dataSource.query(
      `
        INSERT INTO service_types (
          id, category_id, sla_policy_id, code, name, default_priority,
          estimated_duration_minutes, is_other, is_active
        ) VALUES ($1, $2, $3, $4, 'Assignment Service', 'normal', 120, false, true)
      `,
      [serviceTypeId, categoryId, slaPolicyId, `ASSIGNMENT_SERVICE_${testRunId}`],
    );
    await dataSource.query(
      `
        INSERT INTO service_areas (id, code, name, is_active)
        VALUES ($1, $2, 'Assignment Area', true),
               ($3, $4, 'Assignment Other Area', true)
      `,
      [areaId, `ASSIGNMENT_AREA_${testRunId}`, otherAreaId, `ASSIGNMENT_OTHER_${testRunId}`],
    );
    await dataSource.query(
      `
        INSERT INTO customer_addresses (
          id, customer_id, service_area_id, line1, city, postal_code, notes
        ) VALUES ($1, $2, $3, '1 Test Street', 'Test City', '10000', null)
      `,
      [addressId, customerId, areaId],
    );
  };

  const seedRequests = async (): Promise<void> => {
    for (const [name, id] of Object.entries(requestIds)) {
      const status = name === 'needsTriage' ? 'needs_triage' : 'created';
      await dataSource.query(
        `
          INSERT INTO service_requests (
            id, customer_id, category_id, service_type_id, address_id, sla_policy_id,
            status, priority, description, preferred_start_at, preferred_end_at,
            estimated_duration_minutes, assignment_deadline_at, completion_deadline_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'normal', $8, $9, $10, 120, $11, $12)
        `,
        [
          id,
          customerId,
          categoryId,
          serviceTypeId,
          addressId,
          slaPolicyId,
          status,
          `Assignment request ${name}`,
          selectedStartsAt,
          selectedEndsAt,
          '2026-07-09T09:00:00.000Z',
          '2026-07-11T09:00:00.000Z',
        ],
      );
      for (const skillId of skillIds) {
        await dataSource.query(
          `INSERT INTO service_request_required_skills (service_request_id, skill_id) VALUES ($1, $2)`,
          [id, skillId],
        );
      }
    }
  };

  const seedTechnicians = async (): Promise<void> => {
    for (const [name, fixture] of Object.entries(technicians)) {
      const status = name === 'inactive' ? 'inactive' : 'active';
      await dataSource.query(
        `
          INSERT INTO technicians (id, user_id, status, daily_assignment_limit, rating)
          VALUES ($1, $2, $3, 4, 4.50)
        `,
        [fixture.id, fixture.userId, status],
      );

      const assignedSkills = name === 'missingSkill' ? [skillIds[0]] : skillIds;
      for (const skillId of assignedSkills) {
        await dataSource.query(
          `INSERT INTO technician_skills (technician_id, skill_id) VALUES ($1, $2)`,
          [fixture.id, skillId],
        );
      }
      await dataSource.query(
        `INSERT INTO technician_service_areas (technician_id, service_area_id) VALUES ($1, $2)`,
        [fixture.id, name === 'wrongArea' ? otherAreaId : areaId],
      );

      const availabilityStartsAt =
        name === 'unavailable' ? '2026-07-10T10:00:00.000Z' : '2026-07-10T08:00:00.000Z';
      await dataSource.query(
        `
          INSERT INTO technician_availability_windows (
            technician_id, starts_at, ends_at, is_available, reason
          ) VALUES ($1, $2, '2026-07-10T12:00:00.000Z', true, null)
        `,
        [fixture.id, availabilityStartsAt],
      );

      if (name === 'blocked') {
        await dataSource.query(
          `
            INSERT INTO technician_availability_windows (
              technician_id, starts_at, ends_at, is_available, reason
            ) VALUES ($1, '2026-07-10T09:30:00.000Z', '2026-07-10T10:00:00.000Z', false, 'Blocked')
          `,
          [fixture.id],
        );
      }
    }
  };

  const seedExistingAssignments = async (): Promise<void> => {
    await insertAssignment(
      requestIds.overlapSource,
      technicians.overlapping.id,
      'assigned',
      '2026-07-10T10:00:00.000Z',
      '2026-07-10T12:00:00.000Z',
    );
    await insertAssignment(
      requestIds.overlapSource,
      technicians.adjacent.id,
      'assigned',
      '2026-07-10T07:00:00.000Z',
      selectedStartsAt,
    );
    await insertAssignment(
      requestIds.overlapSource,
      technicians.adjacent.id,
      'completed',
      selectedStartsAt,
      selectedEndsAt,
    );
    await insertAssignment(
      requestIds.overlapSource,
      technicians.adjacent.id,
      'cancelled',
      selectedStartsAt,
      selectedEndsAt,
    );
    await insertAssignment(
      requestIds.overlapSource,
      technicians.adjacent.id,
      'rejected',
      selectedStartsAt,
      selectedEndsAt,
    );
  };

  const insertAssignment = async (
    serviceRequestId: string,
    technicianId: string,
    status: string,
    startsAt: string,
    endsAt: string,
  ): Promise<void> => {
    await dataSource.query(
      `
        INSERT INTO assignments (
          service_request_id, technician_id, assigned_by_user_id, status, starts_at, ends_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [serviceRequestId, technicianId, dispatcherId, status, startsAt, endsAt],
    );
  };

  const cleanupRows = async (): Promise<void> => {
    const allRequestIds = Object.values(requestIds);
    const allTechnicianIds = Object.values(technicians).map((fixture) => fixture.id);
    const allUserIds = [
      customerId,
      dispatcherId,
      adminId,
      ...Object.values(technicians).map((fixture) => fixture.userId),
    ];

    await dataSource.query(`DELETE FROM outbox_events WHERE aggregate_id = ANY($1::uuid[])`, [
      allRequestIds,
    ]);
    await dataSource.query(`DELETE FROM audit_logs WHERE entity_id = ANY($1::uuid[])`, [
      allRequestIds,
    ]);
    await dataSource.query(
      `DELETE FROM assignments WHERE service_request_id = ANY($1::uuid[]) OR technician_id = ANY($2::uuid[])`,
      [allRequestIds, allTechnicianIds],
    );
    await dataSource.query(
      `DELETE FROM service_request_required_skills WHERE service_request_id = ANY($1::uuid[])`,
      [allRequestIds],
    );
    await dataSource.query(`DELETE FROM service_requests WHERE id = ANY($1::uuid[])`, [
      allRequestIds,
    ]);
    await dataSource.query(
      `DELETE FROM technician_availability_windows WHERE technician_id = ANY($1::uuid[])`,
      [allTechnicianIds],
    );
    await dataSource.query(`DELETE FROM technician_skills WHERE technician_id = ANY($1::uuid[])`, [
      allTechnicianIds,
    ]);
    await dataSource.query(
      `DELETE FROM technician_service_areas WHERE technician_id = ANY($1::uuid[])`,
      [allTechnicianIds],
    );
    await dataSource.query(`DELETE FROM technicians WHERE id = ANY($1::uuid[])`, [
      allTechnicianIds,
    ]);
    await dataSource.query(`DELETE FROM customer_addresses WHERE id = $1`, [addressId]);
    await dataSource.query(`DELETE FROM service_types WHERE id = $1`, [serviceTypeId]);
    await dataSource.query(`DELETE FROM sla_policies WHERE id = $1`, [slaPolicyId]);
    await dataSource.query(`DELETE FROM skills WHERE id = ANY($1::uuid[])`, [skillIds]);
    await dataSource.query(`DELETE FROM service_categories WHERE id = $1`, [categoryId]);
    await dataSource.query(`DELETE FROM service_areas WHERE id = ANY($1::uuid[])`, [
      [areaId, otherAreaId],
    ]);
    await dataSource.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [allUserIds]);
  };
});

function technician(name: string): { id: string; userId: string; name: string } {
  return { id: randomUUID(), userId: randomUUID(), name };
}

const endpoint = (requestId: string): string => `/api/v1/service-requests/${requestId}/assignments`;

const body = (technicianId: string) => ({
  technicianId,
  startsAt: selectedStartsAt,
  endsAt: selectedEndsAt,
});
