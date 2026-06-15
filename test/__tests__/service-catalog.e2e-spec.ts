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
const activeCategoryId = randomUUID();
const inactiveCategoryId = randomUUID();
const slaPolicyId = randomUUID();
const activeSkillId = randomUUID();
const inactiveSkillId = randomUUID();
const activeServiceTypeId = randomUUID();
const inactiveServiceTypeId = randomUUID();

describe('Service catalog API', () => {
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

    await seedCatalogRows();
  });

  afterAll(async () => {
    if (dataSource) {
      await cleanupCatalogRows();
    }

    if (app) {
      await app.close();
    }
  });

  it('rejects unauthenticated catalog reads', async () => {
    await request(httpServer).get('/api/v1/service-catalog/categories').expect(401);
  });

  it('allows customers to list active categories only', async () => {
    const response = await request(httpServer)
      .get('/api/v1/service-catalog/categories')
      .set('Cookie', authCookie(RoleCode.Customer))
      .expect(200);

    const codes = response.body.data.map((category: { code: string }) => category.code);

    expect(codes).toContain(`TEST_ACTIVE_${testRunId}`);
    expect(codes).not.toContain(`TEST_INACTIVE_${testRunId}`);
  });

  it('allows technicians to list categories', async () => {
    await request(httpServer)
      .get('/api/v1/service-catalog/categories')
      .set('Cookie', authCookie(RoleCode.Technician))
      .expect(200);
  });

  it('lists active service types for an active category', async () => {
    const response = await request(httpServer)
      .get(`/api/v1/service-catalog/categories/${activeCategoryId}/service-types`)
      .set('Cookie', authCookie(RoleCode.Dispatcher))
      .expect(200);

    expect(response.body).toEqual({
      data: [
        {
          id: activeServiceTypeId,
          categoryId: activeCategoryId,
          code: `TEST_ACTIVE_SERVICE_${testRunId}`,
          name: 'A Test Active Service',
          description: 'Active service type for e2e test.',
          defaultPriority: 'normal',
          estimatedDurationMinutes: 45,
          isOther: false,
          slaPolicy: {
            id: slaPolicyId,
            code: `TEST_SLA_${testRunId}`,
            name: 'Test SLA Policy',
          },
          requiredSkills: [
            {
              id: activeSkillId,
              code: `TEST_ACTIVE_SKILL_${testRunId}`,
              name: 'Test Active Skill',
            },
          ],
        },
      ],
    });
  });

  it('forbids technicians from listing service types', async () => {
    await request(httpServer)
      .get(`/api/v1/service-catalog/categories/${activeCategoryId}/service-types`)
      .set('Cookie', authCookie(RoleCode.Technician))
      .expect(403);
  });

  it('returns not found for inactive categories', async () => {
    await request(httpServer)
      .get(`/api/v1/service-catalog/categories/${inactiveCategoryId}/service-types`)
      .set('Cookie', authCookie(RoleCode.Admin))
      .expect(404);
  });

  it('rejects invalid category ids', async () => {
    await request(httpServer)
      .get('/api/v1/service-catalog/categories/not-a-uuid/service-types')
      .set('Cookie', authCookie(RoleCode.Customer))
      .expect(400);
  });

  const authCookie = (role: RoleCode): string => {
    const tokens = authTokenService.issueTokens({
      sub: randomUUID(),
      roles: [role],
    });

    return `${ACCESS_TOKEN_COOKIE}=${tokens.accessToken}`;
  };

  const seedCatalogRows = async (): Promise<void> => {
    await dataSource.query(
      `
        INSERT INTO service_categories (id, code, name, description, is_active)
        VALUES
          ($1, $2, 'ZZZ Test Active Category', 'Active category for e2e test.', true),
          ($3, $4, 'ZZZ Test Inactive Category', 'Inactive category for e2e test.', false)
      `,
      [
        activeCategoryId,
        `TEST_ACTIVE_${testRunId}`,
        inactiveCategoryId,
        `TEST_INACTIVE_${testRunId}`,
      ],
    );

    await dataSource.query(
      `
        INSERT INTO skills (id, code, name, description, is_active)
        VALUES
          ($1, $2, 'Test Active Skill', 'Active skill for e2e test.', true),
          ($3, $4, 'Test Inactive Skill', 'Inactive skill for e2e test.', false)
      `,
      [
        activeSkillId,
        `TEST_ACTIVE_SKILL_${testRunId}`,
        inactiveSkillId,
        `TEST_INACTIVE_SKILL_${testRunId}`,
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
        VALUES ($1, $2, 'Test SLA Policy', 'normal', 30, 120, true)
      `,
      [slaPolicyId, `TEST_SLA_${testRunId}`],
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
          (
            $1,
            $2,
            $3,
            $4,
            'A Test Active Service',
            'Active service type for e2e test.',
            'normal',
            45,
            false,
            true
          ),
          (
            $5,
            $2,
            $3,
            $6,
            'B Test Inactive Service',
            'Inactive service type for e2e test.',
            'normal',
            45,
            false,
            false
          )
      `,
      [
        activeServiceTypeId,
        activeCategoryId,
        slaPolicyId,
        `TEST_ACTIVE_SERVICE_${testRunId}`,
        inactiveServiceTypeId,
        `TEST_INACTIVE_SERVICE_${testRunId}`,
      ],
    );

    await dataSource.query(
      `
        INSERT INTO service_type_required_skills (service_type_id, skill_id)
        VALUES
          ($1, $2),
          ($1, $3)
      `,
      [activeServiceTypeId, activeSkillId, inactiveSkillId],
    );
  };

  const cleanupCatalogRows = async (): Promise<void> => {
    await dataSource.query(
      'DELETE FROM service_type_required_skills WHERE service_type_id IN ($1, $2)',
      [activeServiceTypeId, inactiveServiceTypeId],
    );
    await dataSource.query('DELETE FROM service_types WHERE id IN ($1, $2)', [
      activeServiceTypeId,
      inactiveServiceTypeId,
    ]);
    await dataSource.query('DELETE FROM sla_policies WHERE id = $1', [slaPolicyId]);
    await dataSource.query('DELETE FROM skills WHERE id IN ($1, $2)', [
      activeSkillId,
      inactiveSkillId,
    ]);
    await dataSource.query('DELETE FROM service_categories WHERE id IN ($1, $2)', [
      activeCategoryId,
      inactiveCategoryId,
    ]);
  };
});
