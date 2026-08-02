import { migrateTestDatabase } from '../database/migrate-test-database';
import { startTestServices } from './test-services';

jest.setTimeout(120000);

describe('Testcontainers integration services', () => {
  it('starts isolated PostgreSQL and Redis and applies database migrations', async () => {
    const services = await startTestServices();

    try {
      expect(services.databaseUrl).toContain('postgresql://');
      expect(services.redisUrl).toContain('redis://');
      migrateTestDatabase(services.databaseUrl);
    } finally {
      await services.stop();
    }
  });
});
