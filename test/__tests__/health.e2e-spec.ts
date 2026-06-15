import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { HealthController } from '@api/http/health.controller';

describe('Health endpoint', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: ['health'],
    });

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /health returns ok', () => {
    const controller = app.get(HealthController);

    expect(controller.getHealth()).toEqual({
      status: 'ok',
      service: 'servicehub-api',
    });
  });
});
