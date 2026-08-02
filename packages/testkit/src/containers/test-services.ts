import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';

export type TestServices = {
  databaseUrl: string;
  redisUrl: string;
  stop(): Promise<void>;
};

/** Starts isolated PostgreSQL and Redis services for integration suites. */
export async function startTestServices(): Promise<TestServices> {
  // PostgreSqlContainer's default health-check strategy can hang with some
  // Docker Desktop/engine combinations. Use an explicit, portable log wait.
  const postgres = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_DB: 'opensignflow_test',
      POSTGRES_USER: 'opensignflow',
      POSTGRES_PASSWORD: 'opensignflow',
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
    .start();
  const redis = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
    .start();

  return createServices(postgres, redis);
}

function createServices(postgres: StartedTestContainer, redis: StartedTestContainer): TestServices {
  const databaseUrl = `postgresql://opensignflow:opensignflow@${postgres.getHost()}:${postgres.getMappedPort(5432)}/opensignflow_test?schema=public`;
  return {
    databaseUrl,
    redisUrl: `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`,
    async stop() {
      await Promise.all([postgres.stop(), redis.stop()]);
    },
  };
}
