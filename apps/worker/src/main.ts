import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { loadRepositoryEnvironment } from '@opensignflow/config';
import { probeQueueReadiness } from '@opensignflow/queue';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  loadRepositoryEnvironment();

  const redisUrl = requiredRedisUrl();
  const readiness = await probeQueueReadiness({
    redisUrl,
    connectionName: 'worker-startup-readiness-probe',
  });

  if (!readiness.ready) {
    throw new Error(
      `Worker startup blocked: Redis is unavailable at ${readiness.target}. ${readiness.reason}`,
    );
  }

  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  Logger.log('Worker process started.', 'Bootstrap');
}

function requiredRedisUrl(): string {
  const value = process.env.REDIS_URL;
  if (!value) {throw new Error('Worker startup blocked: REDIS_URL is required.');}
  new URL(value);
  return value;
}

void bootstrap().catch((error: unknown) => {
  Logger.error(
    error instanceof Error ? error.message : 'Worker startup failed.',
    undefined,
    'Bootstrap',
  );
  process.exitCode = 1;
});
