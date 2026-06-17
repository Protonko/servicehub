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
const activeServiceAreaId = randomUUID();
const inactiveServiceAreaId = randomUUID();
const otherCustomerAddressId = randomUUID();

describe('Customer addresses and service areas API', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authTokenService: AuthTokenService;
  let httpServer: Server;
  let createdAddressId: string;

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

  it('rejects unauthenticated service area reads', async () => {
    await request(httpServer).get('/api/v1/service-areas').expect(401);
  });

  it('allows authenticated roles to list active service areas only', async () => {
    const response = await request(httpServer)
      .get('/api/v1/service-areas')
      .set('Cookie', authCookie(RoleCode.Dispatcher))
      .expect(200);

    const codes = response.body.data.map((serviceArea: { code: string }) => serviceArea.code);

    expect(codes).toContain(`TEST_AREA_ACTIVE_${testRunId}`);
    expect(codes).not.toContain(`TEST_AREA_INACTIVE_${testRunId}`);
  });

  it('allows customers to create an address with an active service area', async () => {
    const response = await request(httpServer)
      .post('/api/v1/customer-addresses')
      .set('Cookie', authCookie(RoleCode.Customer, customerId))
      .send({
        serviceAreaId: activeServiceAreaId,
        line1: ' 12 Rustaveli Avenue ',
        line2: '',
        city: ' Tbilisi ',
        postalCode: '0108',
        notes: ' Use the rear entrance. ',
      })
      .expect(201);

    createdAddressId = response.body.data.id;

    expect(response.body.data).toEqual({
      id: expect.any(String),
      customerId,
      serviceArea: {
        id: activeServiceAreaId,
        code: `TEST_AREA_ACTIVE_${testRunId}`,
        name: 'ZZZ Test Active Service Area',
        isActive: true,
      },
      line1: '12 Rustaveli Avenue',
      line2: null,
      city: 'Tbilisi',
      postalCode: '0108',
      notes: 'Use the rear entrance.',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('rejects address creation with an inactive service area', async () => {
    const response = await request(httpServer)
      .post('/api/v1/customer-addresses')
      .set('Cookie', authCookie(RoleCode.Customer, customerId))
      .send({
        serviceAreaId: inactiveServiceAreaId,
        line1: '12 Rustaveli Avenue',
        city: 'Tbilisi',
      })
      .expect(404);

    expect(response.body.error.code).toBe('SERVICE_AREA_NOT_FOUND');
  });

  it('forbids non-customers from creating customer addresses', async () => {
    await request(httpServer)
      .post('/api/v1/customer-addresses')
      .set('Cookie', authCookie(RoleCode.Dispatcher))
      .send({
        serviceAreaId: activeServiceAreaId,
        line1: '12 Rustaveli Avenue',
        city: 'Tbilisi',
      })
      .expect(403);
  });

  it('lists only the authenticated customer addresses', async () => {
    const response = await request(httpServer)
      .get('/api/v1/customer-addresses')
      .set('Cookie', authCookie(RoleCode.Customer, customerId))
      .expect(200);

    const ids = response.body.data.map((address: { id: string }) => address.id);

    expect(ids).toContain(createdAddressId);
    expect(ids).not.toContain(otherCustomerAddressId);
  });

  it('updates a customer-owned address', async () => {
    const response = await request(httpServer)
      .patch(`/api/v1/customer-addresses/${createdAddressId}`)
      .set('Cookie', authCookie(RoleCode.Customer, customerId))
      .send({
        line1: '14 Rustaveli Avenue',
        notes: null,
      })
      .expect(200);

    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: createdAddressId,
        customerId,
        line1: '14 Rustaveli Avenue',
        notes: null,
      }),
    );
  });

  it('returns not found when a customer updates another customer address', async () => {
    const response = await request(httpServer)
      .patch(`/api/v1/customer-addresses/${otherCustomerAddressId}`)
      .set('Cookie', authCookie(RoleCode.Customer, customerId))
      .send({
        line1: 'Hidden Address',
      })
      .expect(404);

    expect(response.body.error.code).toBe('CUSTOMER_ADDRESS_NOT_FOUND');
  });

  it('rejects empty patch bodies and invalid address ids', async () => {
    await request(httpServer)
      .patch(`/api/v1/customer-addresses/${createdAddressId}`)
      .set('Cookie', authCookie(RoleCode.Customer, customerId))
      .send({})
      .expect(400);

    await request(httpServer)
      .patch('/api/v1/customer-addresses/not-a-uuid')
      .set('Cookie', authCookie(RoleCode.Customer, customerId))
      .send({ line1: 'Updated' })
      .expect(400);
  });

  const authCookie = (role: RoleCode, userId = randomUUID()): string => {
    const tokens = authTokenService.issueTokens({
      sub: userId,
      roles: [role],
    });

    return `${ACCESS_TOKEN_COOKIE}=${tokens.accessToken}`;
  };

  const seedRows = async (): Promise<void> => {
    await dataSource.query(
      `
        INSERT INTO users (id, email, password_hash, full_name, is_active)
        VALUES
          ($1, $2, 'hash', 'Test Customer', true),
          ($3, $4, 'hash', 'Other Test Customer', true)
      `,
      [
        customerId,
        `customer-address-${testRunId}@example.com`,
        otherCustomerId,
        `other-customer-address-${testRunId}@example.com`,
      ],
    );

    await dataSource.query(
      `
        INSERT INTO service_areas (id, code, name, description, is_active)
        VALUES
          ($1, $2, 'ZZZ Test Active Service Area', 'Active service area for e2e test.', true),
          ($3, $4, 'ZZZ Test Inactive Service Area', 'Inactive service area for e2e test.', false)
      `,
      [
        activeServiceAreaId,
        `TEST_AREA_ACTIVE_${testRunId}`,
        inactiveServiceAreaId,
        `TEST_AREA_INACTIVE_${testRunId}`,
      ],
    );

    await dataSource.query(
      `
        INSERT INTO customer_addresses (
          id,
          customer_id,
          service_area_id,
          line1,
          city,
          notes
        )
        VALUES ($1, $2, $3, 'Other Customer Address', 'Tbilisi', 'Private address.')
      `,
      [otherCustomerAddressId, otherCustomerId, activeServiceAreaId],
    );
  };

  const cleanupRows = async (): Promise<void> => {
    if (createdAddressId) {
      await dataSource.query('DELETE FROM customer_addresses WHERE id = $1', [createdAddressId]);
    }
    await dataSource.query('DELETE FROM customer_addresses WHERE id = $1', [
      otherCustomerAddressId,
    ]);
    await dataSource.query('DELETE FROM service_areas WHERE id IN ($1, $2)', [
      activeServiceAreaId,
      inactiveServiceAreaId,
    ]);
    await dataSource.query('DELETE FROM users WHERE id IN ($1, $2)', [customerId, otherCustomerId]);
  };
});
