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
const requestId = randomUUID();
const needsTriageRequestId = randomUUID();
const assignmentSourceRequestId = randomUUID();
const customerId = randomUUID();
const assignedByUserId = randomUUID();
const categoryId = randomUUID();
const serviceTypeId = randomUUID();
const slaPolicyId = randomUUID();
const requiredSkillIds = [randomUUID(), randomUUID()];
const requestAreaId = randomUUID();
const otherAreaId = randomUUID();
const requestAddressId = randomUUID();
const otherAddressId = randomUUID();
const requestedStartsAt = '2026-07-10T09:00:00.000Z';
const requestedEndsAt = '2026-07-10T11:00:00.000Z';

const technicianFixtures = {
  lowWorkload: { id: randomUUID(), userId: randomUUID(), name: 'Beta Low Workload' },
  highRating: { id: randomUUID(), userId: randomUUID(), name: 'Alpha High Rating' },
  inactive: { id: randomUUID(), userId: randomUUID(), name: 'Inactive Technician' },
  missingSkill: { id: randomUUID(), userId: randomUUID(), name: 'Missing Skill' },
  wrongArea: { id: randomUUID(), userId: randomUUID(), name: 'Wrong Area' },
  outsideAvailability: { id: randomUUID(), userId: randomUUID(), name: 'Outside Availability' },
  blocked: { id: randomUUID(), userId: randomUUID(), name: 'Blocked Technician' },
  overlapping: { id: randomUUID(), userId: randomUUID(), name: 'Overlapping Assignment' },
};

describe('Eligible technician search API', () => {
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

  it('requires authentication and dispatcher/admin role', async () => {
    await request(httpServer).get(endpoint(requestId)).expect(401);
    await request(httpServer)
      .get(endpoint(requestId))
      .set('Cookie', authCookie(RoleCode.Customer))
      .expect(403);
    await request(httpServer)
      .get(endpoint(requestId))
      .set('Cookie', authCookie(RoleCode.Technician))
      .expect(403);
  });

  it.each([RoleCode.Dispatcher, RoleCode.Admin])(
    'returns only eligible candidates in deterministic order for %s',
    async (role) => {
      const response = await request(httpServer)
        .get(endpoint(requestId))
        .set('Cookie', authCookie(role))
        .expect(200);

      expect(response.body.data).toEqual({
        requestId,
        startsAt: requestedStartsAt,
        endsAt: requestedEndsAt,
        candidates: [
          {
            technicianId: technicianFixtures.lowWorkload.id,
            user: {
              id: technicianFixtures.lowWorkload.userId,
              fullName: technicianFixtures.lowWorkload.name,
            },
            rating: 4,
            dailyAssignmentLimit: 4,
            skillIds: [...requiredSkillIds].sort(),
            serviceAreaIds: [requestAreaId],
            activeAssignmentCount: 0,
          },
          {
            technicianId: technicianFixtures.highRating.id,
            user: {
              id: technicianFixtures.highRating.userId,
              fullName: technicianFixtures.highRating.name,
            },
            rating: 5,
            dailyAssignmentLimit: 4,
            skillIds: [...requiredSkillIds].sort(),
            serviceAreaIds: [requestAreaId],
            activeAssignmentCount: 1,
          },
        ],
      });
    },
  );

  it('returns not found for a missing request and conflict for a non-assignable request', async () => {
    const missing = await request(httpServer)
      .get(endpoint(randomUUID()))
      .set('Cookie', authCookie(RoleCode.Dispatcher))
      .expect(404);
    expect(missing.body.error.code).toBe('SERVICE_REQUEST_NOT_FOUND');

    const conflict = await request(httpServer)
      .get(endpoint(needsTriageRequestId))
      .set('Cookie', authCookie(RoleCode.Dispatcher))
      .expect(409);
    expect(conflict.body.error.code).toBe('SERVICE_REQUEST_NOT_ASSIGNABLE');
  });

  it('rejects invalid or reversed selected slots', async () => {
    await request(httpServer)
      .get(
        `/api/v1/service-requests/${requestId}/eligible-technicians?startsAt=invalid&endsAt=${encodeURIComponent(requestedEndsAt)}`,
      )
      .set('Cookie', authCookie(RoleCode.Dispatcher))
      .expect(400);

    const reversed = await request(httpServer)
      .get(
        `/api/v1/service-requests/${requestId}/eligible-technicians?startsAt=${encodeURIComponent(requestedEndsAt)}&endsAt=${encodeURIComponent(requestedStartsAt)}`,
      )
      .set('Cookie', authCookie(RoleCode.Dispatcher))
      .expect(400);
    expect(reversed.body.error.code).toBe('TECHNICIAN_ELIGIBILITY_WINDOW_INVALID');
  });

  it('enforces assignment time ranges at the PostgreSQL boundary', async () => {
    await expect(
      dataSource.query(
        `
          INSERT INTO assignments (
            service_request_id, technician_id, assigned_by_user_id,
            status, starts_at, ends_at
          )
          VALUES ($1, $2, $3, 'assigned', $4, $4)
        `,
        [
          assignmentSourceRequestId,
          technicianFixtures.highRating.id,
          assignedByUserId,
          requestedStartsAt,
        ],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  const endpoint = (targetRequestId: string): string =>
    `/api/v1/service-requests/${targetRequestId}/eligible-technicians?startsAt=${encodeURIComponent(requestedStartsAt)}&endsAt=${encodeURIComponent(requestedEndsAt)}`;

  const authCookie = (role: RoleCode): string => {
    const tokens = authTokenService.issueTokens({ sub: randomUUID(), roles: [role] });
    return `${ACCESS_TOKEN_COOKIE}=${tokens.accessToken}`;
  };

  const seedRows = async (): Promise<void> => {
    const technicians = Object.values(technicianFixtures);

    await dataSource.query(
      `
        INSERT INTO users (id, email, password_hash, full_name, is_active)
        VALUES ($1, $2, 'hash', 'Eligibility Customer', true),
               ($3, $4, 'hash', 'Eligibility Dispatcher', true)
      `,
      [
        customerId,
        `eligibility-customer-${testRunId}@example.com`,
        assignedByUserId,
        `eligibility-dispatcher-${testRunId}@example.com`,
      ],
    );

    for (const [index, technician] of technicians.entries()) {
      await dataSource.query(
        `INSERT INTO users (id, email, password_hash, full_name, is_active) VALUES ($1, $2, 'hash', $3, true)`,
        [technician.userId, `eligibility-tech-${index}-${testRunId}@example.com`, technician.name],
      );
    }

    await dataSource.query(
      `INSERT INTO service_categories (id, code, name, is_active) VALUES ($1, $2, 'Eligibility Category', true)`,
      [categoryId, `ELIGIBILITY_CATEGORY_${testRunId}`],
    );
    await dataSource.query(
      `
        INSERT INTO skills (id, code, name, is_active)
        VALUES ($1, $2, 'Eligibility Skill One', true),
               ($3, $4, 'Eligibility Skill Two', true)
      `,
      [
        requiredSkillIds[0],
        `ELIGIBILITY_SKILL_ONE_${testRunId}`,
        requiredSkillIds[1],
        `ELIGIBILITY_SKILL_TWO_${testRunId}`,
      ],
    );
    await dataSource.query(
      `
        INSERT INTO sla_policies (
          id, code, name, priority, assignment_deadline_minutes,
          completion_deadline_minutes, is_active
        )
        VALUES ($1, $2, 'Eligibility SLA', 'normal', 60, 240, true)
      `,
      [slaPolicyId, `ELIGIBILITY_SLA_${testRunId}`],
    );
    await dataSource.query(
      `
        INSERT INTO service_types (
          id, category_id, sla_policy_id, code, name, default_priority,
          estimated_duration_minutes, is_other, is_active
        )
        VALUES ($1, $2, $3, $4, 'Eligibility Service', 'normal', 120, false, true)
      `,
      [serviceTypeId, categoryId, slaPolicyId, `ELIGIBILITY_SERVICE_${testRunId}`],
    );
    await dataSource.query(
      `
        INSERT INTO service_areas (id, code, name, is_active)
        VALUES ($1, $2, 'Request Area', true), ($3, $4, 'Other Area', true)
      `,
      [
        requestAreaId,
        `ELIGIBILITY_REQUEST_AREA_${testRunId}`,
        otherAreaId,
        `ELIGIBILITY_OTHER_AREA_${testRunId}`,
      ],
    );
    await dataSource.query(
      `
        INSERT INTO customer_addresses (
          id, customer_id, service_area_id, line1, city
        )
        VALUES ($1, $2, $3, '1 Request Street', 'Tbilisi'),
               ($4, $2, $5, '2 Other Street', 'Tbilisi')
      `,
      [requestAddressId, customerId, requestAreaId, otherAddressId, otherAreaId],
    );

    await seedRequests();

    for (const technician of technicians) {
      await dataSource.query(
        `
          INSERT INTO technicians (id, user_id, status, daily_assignment_limit, rating)
          VALUES ($1, $2, $3, 4, $4)
        `,
        [
          technician.id,
          technician.userId,
          technician === technicianFixtures.inactive ? 'inactive' : 'active',
          technician === technicianFixtures.highRating ? 5 : 4,
        ],
      );
    }

    await seedTechnicianLinksAndAvailability();
    await seedAssignments();
  };

  const seedRequests = async (): Promise<void> => {
    const insertRequest = async (id: string, status: string, addressId: string) =>
      dataSource.query(
        `
          INSERT INTO service_requests (
            id, customer_id, category_id, service_type_id, address_id, sla_policy_id,
            status, priority, description, preferred_start_at, preferred_end_at,
            estimated_duration_minutes, assignment_deadline_at, completion_deadline_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, 'normal', 'Eligibility request',
            '2026-07-10T09:00:00Z', '2026-07-10T11:00:00Z', 120,
            '2026-07-09T12:00:00Z', '2026-07-11T12:00:00Z'
          )
        `,
        [id, customerId, categoryId, serviceTypeId, addressId, slaPolicyId, status],
      );

    await insertRequest(requestId, 'created', requestAddressId);
    await insertRequest(needsTriageRequestId, 'needs_triage', requestAddressId);
    await insertRequest(assignmentSourceRequestId, 'assigned', otherAddressId);
    await dataSource.query(
      `
        INSERT INTO service_request_required_skills (service_request_id, skill_id)
        VALUES ($1, $2), ($1, $3)
      `,
      [requestId, ...requiredSkillIds],
    );
  };

  const seedTechnicianLinksAndAvailability = async (): Promise<void> => {
    for (const technician of Object.values(technicianFixtures)) {
      const skills =
        technician === technicianFixtures.missingSkill ? [requiredSkillIds[0]] : requiredSkillIds;
      const areaId = technician === technicianFixtures.wrongArea ? otherAreaId : requestAreaId;

      for (const skillId of skills) {
        await dataSource.query(
          'INSERT INTO technician_skills (technician_id, skill_id) VALUES ($1, $2)',
          [technician.id, skillId],
        );
      }
      await dataSource.query(
        'INSERT INTO technician_service_areas (technician_id, service_area_id) VALUES ($1, $2)',
        [technician.id, areaId],
      );

      const window =
        technician === technicianFixtures.outsideAvailability
          ? ['2026-07-10T12:00:00Z', '2026-07-10T14:00:00Z']
          : ['2026-07-10T08:00:00Z', '2026-07-10T18:00:00Z'];
      await dataSource.query(
        `
          INSERT INTO technician_availability_windows (
            technician_id, starts_at, ends_at, is_available
          )
          VALUES ($1, $2, $3, true)
        `,
        [technician.id, ...window],
      );
    }

    await dataSource.query(
      `
        INSERT INTO technician_availability_windows (
          technician_id, starts_at, ends_at, is_available, reason
        )
        VALUES ($1, '2026-07-10T10:00:00Z', '2026-07-10T10:30:00Z', false, 'Blocked')
      `,
      [technicianFixtures.blocked.id],
    );
  };

  const seedAssignments = async (): Promise<void> => {
    const insertAssignment = async (
      technicianId: string,
      status: string,
      startsAt: string,
      endsAt: string,
    ) =>
      dataSource.query(
        `
          INSERT INTO assignments (
            service_request_id, technician_id, assigned_by_user_id,
            status, starts_at, ends_at
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [assignmentSourceRequestId, technicianId, assignedByUserId, status, startsAt, endsAt],
      );

    await insertAssignment(
      technicianFixtures.lowWorkload.id,
      'completed',
      '2026-07-10T09:30:00Z',
      '2026-07-10T10:30:00Z',
    );
    await insertAssignment(
      technicianFixtures.highRating.id,
      'assigned',
      '2026-07-10T07:00:00Z',
      requestedStartsAt,
    );
    await insertAssignment(
      technicianFixtures.overlapping.id,
      'assigned',
      '2026-07-10T10:00:00Z',
      '2026-07-10T12:00:00Z',
    );
  };

  const cleanupRows = async (): Promise<void> => {
    const requestIds = [requestId, needsTriageRequestId, assignmentSourceRequestId];
    const technicianIds = Object.values(technicianFixtures).map((technician) => technician.id);
    const technicianUserIds = Object.values(technicianFixtures).map(
      (technician) => technician.userId,
    );
    const userIds = [customerId, assignedByUserId, ...technicianUserIds];

    await dataSource.query('DELETE FROM assignments WHERE service_request_id = ANY($1::uuid[])', [
      requestIds,
    ]);
    await dataSource.query(
      'DELETE FROM service_request_required_skills WHERE service_request_id = ANY($1::uuid[])',
      [requestIds],
    );
    await dataSource.query('DELETE FROM service_requests WHERE id = ANY($1::uuid[])', [requestIds]);
    await dataSource.query('DELETE FROM technicians WHERE id = ANY($1::uuid[])', [technicianIds]);
    await dataSource.query('DELETE FROM customer_addresses WHERE id = ANY($1::uuid[])', [
      [requestAddressId, otherAddressId],
    ]);
    await dataSource.query('DELETE FROM service_types WHERE id = $1', [serviceTypeId]);
    await dataSource.query('DELETE FROM skills WHERE id = ANY($1::uuid[])', [requiredSkillIds]);
    await dataSource.query('DELETE FROM sla_policies WHERE id = $1', [slaPolicyId]);
    await dataSource.query('DELETE FROM service_categories WHERE id = $1', [categoryId]);
    await dataSource.query('DELETE FROM service_areas WHERE id = ANY($1::uuid[])', [
      [requestAreaId, otherAreaId],
    ]);
    await dataSource.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [userIds]);
  };
});
