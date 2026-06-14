import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { ACCESS_TOKEN_COOKIE } from '@application/auth';
import { AUTH_TOKEN_SERVICE, AuthTokenService } from '@contract/auth';
import { RoleCode } from '@domain/model';
import { AppModule } from '../src/app.module';

jest.setTimeout(30000);

const testRunId = randomUUID().replaceAll('-', '').slice(0, 12);
const activeCategoryId = randomUUID();
const activeSkillId = randomUUID();
const inactiveSkillId = randomUUID();
const slaPolicyId = randomUUID();
const inactiveSlaPolicyId = randomUUID();
const serviceTypeToDeactivateId = randomUUID();

describe('Admin service catalog API', () => {
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

    await cleanupCatalogRows();
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

  it('rejects unauthenticated category creation', async () => {
    await request(httpServer)
      .post('/api/v1/admin/service-catalog/categories')
      .send({
        code: `TEST_ADMIN_UNAUTH_${testRunId}`,
        name: 'Unauthenticated Category',
      })
      .expect(401);
  });

  it('forbids dispatchers from creating categories', async () => {
    await request(httpServer)
      .post('/api/v1/admin/service-catalog/categories')
      .set('Cookie', authCookie(RoleCode.Dispatcher))
      .send({
        code: `TEST_ADMIN_FORBIDDEN_${testRunId}`,
        name: 'Forbidden Category',
      })
      .expect(403);
  });

  it('allows admins to create a category and rejects duplicate category codes', async () => {
    const requestBody = {
      code: `test_admin_created_${testRunId}`,
      name: 'Test Admin Created Category',
      description: 'Created through admin e2e test.',
    };

    const createResponse = await request(httpServer)
      .post('/api/v1/admin/service-catalog/categories')
      .set('Cookie', authCookie(RoleCode.Admin))
      .send(requestBody)
      .expect(201);

    expect(createResponse.body.data).toEqual({
      id: expect.any(String),
      code: `TEST_ADMIN_CREATED_${testRunId.toUpperCase()}`,
      name: requestBody.name,
      description: requestBody.description,
      isActive: true,
    });

    const duplicateResponse = await request(httpServer)
      .post('/api/v1/admin/service-catalog/categories')
      .set('Cookie', authCookie(RoleCode.Admin))
      .send(requestBody)
      .expect(409);

    expect(duplicateResponse.body.error.code).toBe('SERVICE_CATEGORY_CODE_ALREADY_EXISTS');
  });

  it('allows admins to create a service type with required skills', async () => {
    const response = await request(httpServer)
      .post('/api/v1/admin/service-catalog/service-types')
      .set('Cookie', authCookie(RoleCode.Admin))
      .send({
        categoryId: activeCategoryId,
        slaPolicyId,
        code: `test_admin_service_${testRunId}`,
        name: 'Test Admin Service Type',
        description: 'Created through admin e2e test.',
        defaultPriority: 'normal',
        estimatedDurationMinutes: 60,
        isOther: false,
        requiredSkillIds: [activeSkillId],
      })
      .expect(201);

    expect(response.body.data).toEqual({
      id: expect.any(String),
      categoryId: activeCategoryId,
      slaPolicyId,
      code: `TEST_ADMIN_SERVICE_${testRunId.toUpperCase()}`,
      name: 'Test Admin Service Type',
      description: 'Created through admin e2e test.',
      defaultPriority: 'normal',
      estimatedDurationMinutes: 60,
      isOther: false,
      isActive: true,
      requiredSkillIds: [activeSkillId],
    });
  });

  it('rejects service type creation when a required skill is inactive', async () => {
    const response = await request(httpServer)
      .post('/api/v1/admin/service-catalog/service-types')
      .set('Cookie', authCookie(RoleCode.Admin))
      .send({
        categoryId: activeCategoryId,
        slaPolicyId,
        code: `TEST_ADMIN_INACTIVE_SKILL_${testRunId}`,
        name: 'Inactive Skill Service Type',
        defaultPriority: 'normal',
        estimatedDurationMinutes: 60,
        isOther: false,
        requiredSkillIds: [inactiveSkillId],
      })
      .expect(404);

    expect(response.body.error.code).toBe('SKILL_NOT_FOUND');
  });

  it('rejects service type creation when the SLA policy is inactive', async () => {
    const response = await request(httpServer)
      .post('/api/v1/admin/service-catalog/service-types')
      .set('Cookie', authCookie(RoleCode.Admin))
      .send({
        categoryId: activeCategoryId,
        slaPolicyId: inactiveSlaPolicyId,
        code: `TEST_ADMIN_INACTIVE_SLA_${testRunId}`,
        name: 'Inactive SLA Service Type',
        defaultPriority: 'normal',
        estimatedDurationMinutes: 60,
        isOther: false,
        requiredSkillIds: [activeSkillId],
      })
      .expect(404);

    expect(response.body.error.code).toBe('SLA_POLICY_NOT_FOUND');
  });

  it('allows admins to deactivate a service type', async () => {
    const response = await request(httpServer)
      .patch(`/api/v1/admin/service-catalog/service-types/${serviceTypeToDeactivateId}`)
      .set('Cookie', authCookie(RoleCode.Admin))
      .send({
        isActive: false,
      })
      .expect(200);

    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: serviceTypeToDeactivateId,
        isActive: false,
      }),
    );
  });

  it('rejects invalid service type path ids', async () => {
    await request(httpServer)
      .patch('/api/v1/admin/service-catalog/service-types/not-a-uuid')
      .set('Cookie', authCookie(RoleCode.Admin))
      .send({
        isActive: false,
      })
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
        VALUES ($1, $2, 'Test Admin Category', 'Category for admin e2e test.', true)
      `,
      [activeCategoryId, `TEST_ADMIN_CATEGORY_${testRunId}`],
    );

    await dataSource.query(
      `
        INSERT INTO skills (id, code, name, description, is_active)
        VALUES
          ($1, $2, 'Test Admin Active Skill', 'Active skill for admin e2e test.', true),
          ($3, $4, 'Test Admin Inactive Skill', 'Inactive skill for admin e2e test.', false)
      `,
      [
        activeSkillId,
        `TEST_ADMIN_ACTIVE_SKILL_${testRunId}`,
        inactiveSkillId,
        `TEST_ADMIN_INACTIVE_SKILL_${testRunId}`,
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
          ($1, $2, 'Test Admin Active SLA', 'normal', 30, 120, true),
          ($3, $4, 'Test Admin Inactive SLA', 'normal', 30, 120, false)
      `,
      [
        slaPolicyId,
        `TEST_ADMIN_ACTIVE_SLA_${testRunId}`,
        inactiveSlaPolicyId,
        `TEST_ADMIN_INACTIVE_SLA_${testRunId}`,
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
        VALUES ($1, $2, $3, $4, 'Test Admin Patch Target', null, 'normal', 60, false, true)
      `,
      [
        serviceTypeToDeactivateId,
        activeCategoryId,
        slaPolicyId,
        `TEST_ADMIN_PATCH_TARGET_${testRunId}`,
      ],
    );
  };

  const cleanupCatalogRows = async (): Promise<void> => {
    await dataSource.query(
      `
        DELETE FROM service_type_required_skills
        WHERE service_type_id IN (
          SELECT id FROM service_types
          WHERE category_id = $1 OR UPPER(code) LIKE UPPER($2)
        )
      `,
      [activeCategoryId, `TEST_ADMIN_%_${testRunId}`],
    );
    await dataSource.query(
      'DELETE FROM service_types WHERE category_id = $1 OR UPPER(code) LIKE UPPER($2)',
      [activeCategoryId, `TEST_ADMIN_%_${testRunId}`],
    );
    await dataSource.query(
      'DELETE FROM service_categories WHERE id = $1 OR UPPER(code) LIKE UPPER($2)',
      [activeCategoryId, `TEST_ADMIN_%_${testRunId}`],
    );
    await dataSource.query('DELETE FROM skills WHERE id IN ($1, $2)', [
      activeSkillId,
      inactiveSkillId,
    ]);
    await dataSource.query('DELETE FROM sla_policies WHERE id IN ($1, $2)', [
      slaPolicyId,
      inactiveSlaPolicyId,
    ]);
  };
});
