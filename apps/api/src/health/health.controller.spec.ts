/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns an API data envelope', () => {
    const controller = new HealthController();
    const response = controller.check();

    expect(response.data.status).toBe('ok');
    expect(response.data.service).toBe('opensignflow-api');
    expect(response.data.timestamp).toBeDefined();
  });
});
