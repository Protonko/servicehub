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
const otherCustomerId = randomUUID();
const categoryId = randomUUID();
const mismatchCategoryId = randomUUID();
const serviceTypeId = randomUUID();
const otherServiceTypeId = randomUUID();
const mismatchServiceTypeId = randomUUID();
const skillId = randomUUID();
const slaPolicyId = randomUUID();
const triageSlaPolicyId = randomUUID();
const serviceAreaId = randomUUID();
const customerAddressId = randomUUID();
const otherCustomerAddressId = randomUUID();

describe('Service requests API', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authTokenService: AuthTokenService;
  let httpServer: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: ['health'],
    });
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

  it('allows a customer to create a service request with copied metadata and side effects', async () => {
    const response = await request(httpServer)
      .post('/api/v1/service-requests')
      .set('Cookie', authCookie(RoleCode.Customer, customerId))
      .send({
        categoryId,
        serviceTypeId,
        addressId: customerAddressId,
        description: '  The air conditioner is leaking. ',
        preferredStartAt: futureIso(24),
        preferredEndAt: futureIso(28),
        additionalContactInstructions: ' Call before arrival. ',
        attachments: [
          {
            fileName: ' leak.jpg ',
            mimeType: ' image/jpeg ',
            storageKey: ` uploads/${testRunId}/leak.jpg `,
          },
        ],
      })
      .expect(201);

    const requestId = response.body.data.id;

    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        customerId,
        categoryId,
        serviceTypeId,
        addressId: customerAddressId,
        slaPolicyId,
        status: 'created',
        priority: 'high',
        description: 'The air conditioner is leaking.',
        additionalContactInstructions: 'Call before arrival.',
        estimatedDurationMinutes: 120,
        requiredSkillIds: [skillId],
        attachments: [
          {
            id: expect.any(String),
            fileName: 'leak.jpg',
            mimeType: 'image/jpeg',
            storageKey: `uploads/${testRunId}/leak.jpg`,
            kind: 'request_photo',
          },
        ],
      }),
    );

    const [sideEffects] = await dataSource.query(
      `
        SELECT
          (SELECT count(*)::int FROM service_request_required_skills WHERE service_request_id = $1) AS skill_count,
          (SELECT count(*)::int FROM service_request_attachments WHERE service_request_id = $1) AS attachment_count,
          (SELECT count(*)::int FROM audit_logs WHERE entity_id = $1 AND action = 'ServiceRequestCreated') AS audit_count,
          (SELECT count(*)::int FROM outbox_events WHERE aggregate_id = $1 AND event_type = 'ServiceRequestCreated' AND status = 'pending') AS outbox_count
      `,
      [requestId],
    );

    expect(sideEffects).toEqual({
      skill_count: 1,
      attachment_count: 1,
      audit_count: 1,
      outbox_count: 1,
    });
  });

  it('creates an Other service type request in needs_triage status', async () => {
    const response = await request(httpServer)
      .post('/api/v1/service-requests')
      .set('Cookie', authCookie(RoleCode.Customer, customerId))
      .send({
        categoryId,
        serviceTypeId: otherServiceTypeId,
        addressId: customerAddressId,
        description: 'I cannot classify the issue.',
        preferredStartAt: futureIso(48),
        preferredEndAt: futureIso(52),
      })
      .expect(201);

    expect(response.body.data.status).toBe('needs_triage');
    expect(response.body.data.priority).toBe('normal');
  });

  it('forbids non-customers from creating service requests', async () => {
    await request(httpServer)
      .post('/api/v1/service-requests')
      .set('Cookie', authCookie(RoleCode.Dispatcher))
      .send({
        categoryId,
        serviceTypeId,
        addressId: customerAddressId,
        description: 'Dispatchers cannot use the customer creation endpoint.',
        preferredStartAt: futureIso(24),
        preferredEndAt: futureIso(28),
      })
      .expect(403);
  });

  it('rejects invalid DTOs', async () => {
    await request(httpServer)
      .post('/api/v1/service-requests')
      .set('Cookie', authCookie(RoleCode.Customer, customerId))
      .send({
        categoryId: 'not-a-uuid',
        serviceTypeId,
        addressId: customerAddressId,
        description: '',
        preferredStartAt: 'not-a-date',
        preferredEndAt: futureIso(28),
      })
      .expect(400);
  });

  it('returns not found when the address belongs to another customer', async () => {
    const response = await request(httpServer)
      .post('/api/v1/service-requests')
      .set('Cookie', authCookie(RoleCode.Customer, customerId))
      .send({
        categoryId,
        serviceTypeId,
        addressId: otherCustomerAddressId,
        description: 'This address is private to another customer.',
        preferredStartAt: futureIso(24),
        preferredEndAt: futureIso(28),
      })
      .expect(404);

    expect(response.body.error.code).toBe('CUSTOMER_ADDRESS_NOT_FOUND');
  });

  it('returns conflict when the service type does not belong to the selected category', async () => {
    const response = await request(httpServer)
      .post('/api/v1/service-requests')
      .set('Cookie', authCookie(RoleCode.Customer, customerId))
      .send({
        categoryId,
        serviceTypeId: mismatchServiceTypeId,
        addressId: customerAddressId,
        description: 'Mismatched service metadata.',
        preferredStartAt: futureIso(24),
        preferredEndAt: futureIso(28),
      })
      .expect(409);

    expect(response.body.error.code).toBe('SERVICE_TYPE_CATEGORY_MISMATCH');
  });

  const authCookie = (role: RoleCode, userId = randomUUID()): string => {
    const tokens = authTokenService.issueTokens({
      sub: userId,
      roles: [role],
    });

    return `${ACCESS_TOKEN_COOKIE}=${tokens.accessToken}`;
  };

  const futureIso = (hoursFromNow: number): string =>
    new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();

  const seedRows = async (): Promise<void> => {
    await dataSource.query(
      `
        INSERT INTO users (id, email, password_hash, full_name, is_active)
        VALUES
          ($1, $2, 'hash', 'Service Request Customer', true),
          ($3, $4, 'hash', 'Other Service Request Customer', true)
      `,
      [
        customerId,
        `service-request-${testRunId}@example.com`,
        otherCustomerId,
        `other-service-request-${testRunId}@example.com`,
      ],
    );

    await dataSource.query(
      `
        INSERT INTO service_categories (id, code, name, description, is_active)
        VALUES
          ($1, $2, 'Test Request HVAC', 'Category for request e2e test.', true),
          ($3, $4, 'Test Request Plumbing', 'Mismatch category for request e2e test.', true)
      `,
      [
        categoryId,
        `TEST_REQUEST_CATEGORY_${testRunId}`,
        mismatchCategoryId,
        `TEST_REQUEST_MISMATCH_CATEGORY_${testRunId}`,
      ],
    );

    await dataSource.query(
      `
        INSERT INTO skills (id, code, name, description, is_active)
        VALUES ($1, $2, 'Test Request Skill', 'Skill for request e2e test.', true)
      `,
      [skillId, `TEST_REQUEST_SKILL_${testRunId}`],
    );

    await dataSource.query(
      `
        INSERT INTO sla_policies (
          id,
          code,
          name,
          priority,
          assignment_deadline_minutes,
          completion_deadline_minutes,
          is_active
        )
        VALUES
          ($1, $2, 'Test Request High SLA', 'high', 30, 180, true),
          ($3, $4, 'Test Request Triage SLA', 'normal', 60, 240, true)
      `,
      [
        slaPolicyId,
        `TEST_REQUEST_SLA_${testRunId}`,
        triageSlaPolicyId,
        `TEST_REQUEST_TRIAGE_SLA_${testRunId}`,
      ],
    );

    await dataSource.query(
      `
        INSERT INTO service_types (
          id,
          category_id,
          sla_policy_id,
          code,
          name,
          description,
          default_priority,
          estimated_duration_minutes,
          is_other,
          is_active
        )
        VALUES
          ($1, $2, $3, $4, 'AC leaking', null, 'high', 120, false, true),
          ($5, $2, $6, 'OTHER', 'Other HVAC issue', null, 'normal', 60, true, true),
          ($7, $8, $3, $9, 'Mismatched plumbing type', null, 'normal', 90, false, true)
      `,
      [
        serviceTypeId,
        categoryId,
        slaPolicyId,
        `TEST_REQUEST_AC_LEAKING_${testRunId}`,
        otherServiceTypeId,
        triageSlaPolicyId,
        mismatchServiceTypeId,
        mismatchCategoryId,
        `TEST_REQUEST_MISMATCH_${testRunId}`,
      ],
    );

    await dataSource.query(
      `
        INSERT INTO service_type_required_skills (service_type_id, skill_id)
        VALUES ($1, $2), ($3, $2)
      `,
      [serviceTypeId, skillId, mismatchServiceTypeId],
    );

    await dataSource.query(
      `
        INSERT INTO service_areas (id, code, name, description, is_active)
        VALUES ($1, $2, 'Test Request Service Area', 'Service area for request e2e test.', true)
      `,
      [serviceAreaId, `TEST_REQUEST_AREA_${testRunId}`],
    );

    await dataSource.query(
      `
        INSERT INTO customer_addresses (id, customer_id, service_area_id, line1, city)
        VALUES
          ($1, $2, $3, '12 Rustaveli Avenue', 'Tbilisi'),
          ($4, $5, $3, '99 Hidden Street', 'Tbilisi')
      `,
      [customerAddressId, customerId, serviceAreaId, otherCustomerAddressId, otherCustomerId],
    );
  };

  const cleanupRows = async (): Promise<void> => {
    await dataSource.query(
      `
        DELETE FROM outbox_events
        WHERE payload ->> 'customerId' IN ($1::text, $2::text)
        OR aggregate_id IN (
          SELECT id FROM service_requests WHERE customer_id IN ($1::uuid, $2::uuid)
        )
      `,
      [customerId, otherCustomerId],
    );
    await dataSource.query(
      `
        DELETE FROM audit_logs
        WHERE entity_id IN (
          SELECT id FROM service_requests WHERE customer_id IN ($1::uuid, $2::uuid)
        )
        OR actor_user_id IN ($1::uuid, $2::uuid)
      `,
      [customerId, otherCustomerId],
    );
    await dataSource.query('DELETE FROM service_requests WHERE customer_id IN ($1, $2)', [
      customerId,
      otherCustomerId,
    ]);
    await dataSource.query(
      'DELETE FROM service_type_required_skills WHERE service_type_id IN ($1, $2, $3)',
      [serviceTypeId, otherServiceTypeId, mismatchServiceTypeId],
    );
    await dataSource.query('DELETE FROM service_types WHERE id IN ($1, $2, $3)', [
      serviceTypeId,
      otherServiceTypeId,
      mismatchServiceTypeId,
    ]);
    await dataSource.query('DELETE FROM customer_addresses WHERE id IN ($1, $2)', [
      customerAddressId,
      otherCustomerAddressId,
    ]);
    await dataSource.query('DELETE FROM service_areas WHERE id = $1', [serviceAreaId]);
    await dataSource.query('DELETE FROM service_categories WHERE id IN ($1, $2)', [
      categoryId,
      mismatchCategoryId,
    ]);
    await dataSource.query('DELETE FROM skills WHERE id = $1', [skillId]);
    await dataSource.query('DELETE FROM sla_policies WHERE id IN ($1, $2)', [
      slaPolicyId,
      triageSlaPolicyId,
    ]);
    await dataSource.query('DELETE FROM users WHERE id IN ($1, $2)', [customerId, otherCustomerId]);
  };
});
