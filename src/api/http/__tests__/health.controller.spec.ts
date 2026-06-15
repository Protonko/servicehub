import { HealthController } from '../health.controller';

describe('HealthController', () => {
  it('returns API health status', () => {
    const controller = new HealthController();

    expect(controller.getHealth()).toEqual({
      status: 'ok',
      service: 'servicehub-api',
    });
  });
});
