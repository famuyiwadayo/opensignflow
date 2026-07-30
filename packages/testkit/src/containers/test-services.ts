import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';

export type TestServices = {
  databaseUrl: string;
  redisUrl: string;
  stop(): Promise<void>;
};

/** Starts isolated PostgreSQL and Redis services for integration suites. */
export async function startTestServices(): Promise<TestServices> {
  const postgres = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('opensignflow_test')
    .withUsername('opensignflow')
    .withPassword('opensignflow')
    .start();
  const redis = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
    .start();

  return createServices(postgres, redis);
}

function createServices(
  postgres: StartedPostgreSqlContainer,
  redis: StartedTestContainer,
): TestServices {
  return {
    databaseUrl: postgres.getConnectionUri(),
    redisUrl: `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`,
    async stop() {
      await Promise.all([postgres.stop(), redis.stop()]);
    },
  };
}
