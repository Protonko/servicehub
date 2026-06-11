import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { ApiModule } from '../src/api/api.module';
import { HealthController } from '../src/api/http/health.controller';

describe('Health endpoint', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ApiModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: ['health'],
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns ok', () => {
    const controller = app.get(HealthController);

    expect(controller.getHealth()).toEqual({
      status: 'ok',
      service: 'servicehub-api',
    });
  });
});
