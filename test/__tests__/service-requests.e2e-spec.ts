import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { ACCESS_TOKEN_COOKIE } from '@application/auth';
import {
  SERVICE_REQUEST_READ_QUERY,
  ServiceRequestReadQuery,
} from '@application/queries/service-request-read.query';
import { AUTH_TOKEN_SERVICE, AuthTokenService } from '@contract/auth';
import { RequestPriority, RoleCode, ServiceRequestStatus } from '@domain/model';
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
const secondSkillId = randomUUID();
const slaPolicyId = randomUUID();
const triageSlaPolicyId = randomUUID();
const serviceAreaId = randomUUID();
const customerAddressId = randomUUID();
const otherCustomerAddressId = randomUUID();
const readRequestId = randomUUID();
const otherCustomerReadRequestId = randomUUID();
const firstAttachmentId = randomUUID();
const secondAttachmentId = randomUUID();

describe('Service requests API', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authTokenService: AuthTokenService;
  let serviceRequestReadQuery: ServiceRequestReadQuery;
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
    serviceRequestReadQuery = app.get<ServiceRequestReadQuery>(SERVICE_REQUEST_READ_QUERY);
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

  it('lists only customer-owned requests with pagination metadata', async () => {
    const response = await request(httpServer)
      .get('/api/v1/service-requests?limit=100&offset=0')
      .set('Cookie', authCookie(RoleCode.Customer, customerId))
      .expect(200);

    expect(response.body.meta).toEqual({
      limit: 100,
      offset: 0,
      total: response.body.data.length,
    });
    expect(response.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: readRequestId })]),
    );
    expect(
      response.body.data.every(
        (item: { customer: { id: string } }) => item.customer.id === customerId,
      ),
    ).toBe(true);
    expect(response.body.data.map((item: { id: string }) => item.id)).not.toContain(
      otherCustomerReadRequestId,
    );
    const createdTimes = response.body.data.map((item: { createdAt: string }) =>
      new Date(item.createdAt).getTime(),
    );
    expect(createdTimes).toEqual([...createdTimes].sort((left, right) => right - left));
  });

  it('applies combined filters and deterministic pagination', async () => {
    const response = await request(httpServer)
      .get('/api/v1/service-requests')
      .query({
        status: 'created',
        priority: 'high',
        categoryId,
        serviceTypeId,
        createdFrom: '2026-06-19T08:00:00.000Z',
        createdTo: '2026-06-19T08:00:00.000Z',
        limit: 1,
        offset: 0,
      })
      .set('Cookie', authCookie(RoleCode.Customer, customerId))
      .expect(200);

    expect(response.body).toEqual({
      data: [expect.objectContaining({ id: readRequestId, status: 'created', priority: 'high' })],
      meta: { limit: 1, offset: 0, total: 1 },
    });
  });

  it('queries PostgreSQL with scoped totals and aggregates joined detail rows without duplicates', async () => {
    const searchResult = await serviceRequestReadQuery.search(
      {
        status: ServiceRequestStatus.Created,
        priority: RequestPriority.High,
        createdFrom: new Date('2026-06-19T08:00:00.000Z'),
        createdTo: new Date('2026-06-19T08:00:00.000Z'),
      },
      { kind: 'customer', customerId },
      { limit: 1, offset: 0 },
    );

    expect(searchResult).toEqual({
      items: [expect.objectContaining({ id: readRequestId })],
      total: 1,
    });

    const detail = await serviceRequestReadQuery.findById(readRequestId, {
      kind: 'customer',
      customerId,
    });

    expect(detail?.requiredSkills).toHaveLength(2);
    expect(detail?.attachments).toHaveLength(2);
    await expect(
      serviceRequestReadQuery.findById(otherCustomerReadRequestId, {
        kind: 'customer',
        customerId,
      }),
    ).resolves.toBeNull();
  });

  it('returns request detail with ordered skill and attachment projections', async () => {
    const response = await request(httpServer)
      .get(`/api/v1/service-requests/${readRequestId}`)
      .set('Cookie', authCookie(RoleCode.Customer, customerId))
      .expect(200);

    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: readRequestId,
        customer: expect.objectContaining({ id: customerId }),
        category: expect.objectContaining({ id: categoryId }),
        serviceType: expect.objectContaining({ id: serviceTypeId }),
        address: expect.objectContaining({
          id: customerAddressId,
          serviceArea: expect.objectContaining({ id: serviceAreaId }),
        }),
        slaPolicy: expect.objectContaining({ id: slaPolicyId }),
        requiredSkills: [
          expect.objectContaining({ id: secondSkillId, name: 'Electrical Diagnostics' }),
          expect.objectContaining({ id: skillId, name: 'Test Request Skill' }),
        ],
        attachments: [
          expect.objectContaining({ id: firstAttachmentId, fileName: 'first.jpg' }),
          expect.objectContaining({ id: secondAttachmentId, fileName: 'second.jpg' }),
        ],
      }),
    );
  });

  it('conceals another customer request from customer list and detail', async () => {
    await request(httpServer)
      .get(`/api/v1/service-requests/${otherCustomerReadRequestId}`)
      .set('Cookie', authCookie(RoleCode.Customer, customerId))
      .expect(404)
      .expect(({ body }) => {
        expect(body.error.code).toBe('SERVICE_REQUEST_NOT_FOUND');
      });
  });

  it.each([RoleCode.Dispatcher, RoleCode.Admin])(
    'allows %s to list and read customer requests',
    async (role) => {
      const listResponse = await request(httpServer)
        .get('/api/v1/service-requests')
        .query({ serviceTypeId: otherServiceTypeId, limit: 100 })
        .set('Cookie', authCookie(role))
        .expect(200);

      expect(listResponse.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: otherCustomerReadRequestId,
            customer: expect.objectContaining({ id: otherCustomerId }),
          }),
        ]),
      );

      await request(httpServer)
        .get(`/api/v1/service-requests/${otherCustomerReadRequestId}`)
        .set('Cookie', authCookie(role))
        .expect(200);
    },
  );

  it('forbids technician read access and requires authentication', async () => {
    await request(httpServer).get('/api/v1/service-requests').expect(401);
    await request(httpServer).get(`/api/v1/service-requests/${readRequestId}`).expect(401);
    await request(httpServer)
      .get('/api/v1/service-requests')
      .set('Cookie', authCookie(RoleCode.Technician))
      .expect(403);
    await request(httpServer)
      .get(`/api/v1/service-requests/${readRequestId}`)
      .set('Cookie', authCookie(RoleCode.Technician))
      .expect(403);
  });

  it.each([
    ['status', 'unknown'],
    ['priority', 'unknown'],
    ['categoryId', 'not-a-uuid'],
    ['createdFrom', 'not-a-date'],
    ['limit', '0'],
    ['limit', '101'],
    ['offset', '-1'],
  ])('rejects invalid %s query values', async (parameter, value) => {
    await request(httpServer)
      .get('/api/v1/service-requests')
      .query({ [parameter]: value })
      .set('Cookie', authCookie(RoleCode.Customer, customerId))
      .expect(400);
  });

  it('rejects an inverted creation date range', async () => {
    await request(httpServer)
      .get('/api/v1/service-requests')
      .query({
        createdFrom: '2026-06-20T00:00:00.000Z',
        createdTo: '2026-06-19T00:00:00.000Z',
      })
      .set('Cookie', authCookie(RoleCode.Customer, customerId))
      .expect(400);
  });

  it('returns an empty page for valid unknown filters and 404 for an unknown request', async () => {
    const response = await request(httpServer)
      .get('/api/v1/service-requests')
      .query({ categoryId: randomUUID() })
      .set('Cookie', authCookie(RoleCode.Customer, customerId))
      .expect(200);

    expect(response.body).toEqual({ data: [], meta: { limit: 20, offset: 0, total: 0 } });

    await request(httpServer)
      .get(`/api/v1/service-requests/${randomUUID()}`)
      .set('Cookie', authCookie(RoleCode.Customer, customerId))
      .expect(404);
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
        VALUES
          ($1, $2, 'Test Request Skill', 'Skill for request e2e test.', true),
          ($3, $4, 'Electrical Diagnostics', 'Second skill for request reads.', false)
      `,
      [
        skillId,
        `TEST_REQUEST_SKILL_${testRunId}`,
        secondSkillId,
        `TEST_REQUEST_SECOND_SKILL_${testRunId}`,
      ],
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
        INSERT INTO customer_addresses (
          id,
          customer_id,
          service_area_id,
          line1,
          line2,
          city,
          postal_code,
          notes
        )
        VALUES
          ($1, $2, $3, '12 Rustaveli Avenue', 'Apartment 14', 'Tbilisi', '0108', 'Rear entrance'),
          ($4, $5, $3, '99 Hidden Street', null, 'Tbilisi', null, null)
      `,
      [customerAddressId, customerId, serviceAreaId, otherCustomerAddressId, otherCustomerId],
    );

    await dataSource.query(
      `
        INSERT INTO service_requests (
          id,
          customer_id,
          category_id,
          service_type_id,
          address_id,
          sla_policy_id,
          status,
          priority,
          description,
          additional_contact_instructions,
          preferred_start_at,
          preferred_end_at,
          estimated_duration_minutes,
          assignment_deadline_at,
          completion_deadline_at,
          created_at,
          updated_at
        )
        VALUES
          (
            $1, $2, $3, $4, $5, $6, 'created', 'high',
            'Fixture request for read models.', 'Call before arrival.',
            '2026-06-20T10:00:00.000Z', '2026-06-20T14:00:00.000Z', 120,
            '2026-06-19T12:00:00.000Z', '2026-06-20T08:00:00.000Z',
            '2026-06-19T08:00:00.000Z', '2026-06-19T08:00:00.000Z'
          ),
          (
            $7, $8, $3, $9, $10, $11, 'needs_triage', 'normal',
            'Another customer read fixture.', null,
            '2026-06-21T10:00:00.000Z', '2026-06-21T14:00:00.000Z', 60,
            '2026-06-20T12:00:00.000Z', '2026-06-21T08:00:00.000Z',
            '2026-06-18T08:00:00.000Z', '2026-06-18T08:00:00.000Z'
          )
      `,
      [
        readRequestId,
        customerId,
        categoryId,
        serviceTypeId,
        customerAddressId,
        slaPolicyId,
        otherCustomerReadRequestId,
        otherCustomerId,
        otherServiceTypeId,
        otherCustomerAddressId,
        triageSlaPolicyId,
      ],
    );

    await dataSource.query(
      `
        INSERT INTO service_request_required_skills (service_request_id, skill_id)
        VALUES ($1, $2), ($1, $3)
      `,
      [readRequestId, skillId, secondSkillId],
    );

    await dataSource.query(
      `
        INSERT INTO service_request_attachments (
          id,
          service_request_id,
          uploaded_by_user_id,
          file_name,
          mime_type,
          storage_key,
          kind,
          created_at
        )
        VALUES
          ($1, $2, $3, 'second.jpg', 'image/jpeg', $4, 'request_photo', '2026-06-19T08:02:00.000Z'),
          ($5, $2, $3, 'first.jpg', 'image/jpeg', $6, 'request_photo', '2026-06-19T08:01:00.000Z')
      `,
      [
        secondAttachmentId,
        readRequestId,
        customerId,
        `uploads/${testRunId}/second.jpg`,
        firstAttachmentId,
        `uploads/${testRunId}/first.jpg`,
      ],
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
    await dataSource.query('DELETE FROM skills WHERE id IN ($1, $2)', [skillId, secondSkillId]);
    await dataSource.query('DELETE FROM sla_policies WHERE id IN ($1, $2)', [
      slaPolicyId,
      triageSlaPolicyId,
    ]);
    await dataSource.query('DELETE FROM users WHERE id IN ($1, $2)', [customerId, otherCustomerId]);
  };
});
