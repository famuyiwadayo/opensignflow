import 'reflect-metadata';

import { HttpStatus, ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';

import { ApiExceptionFilter } from '../common/filters/api-exception.filter';
import { PrismaService } from '../database';
import { QueueReadinessService, SigningEmailQueue } from '../jobs';

/** Creates a production-aligned HTTP test app with explicit isolated infrastructure overrides. */
export async function createTestApi(input: { database: unknown }): Promise<INestApplication> {
  // AppModule evaluates configuration at import time. Call this only after the
  // suite has supplied its isolated Testcontainers environment values.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AppModule } = require('../app.module');
  const module = await Test.createTestingModule({ imports: [AppModule] })
    // Use the fixture client directly; this prevents cached module configuration
    // from accidentally connecting HTTP tests to another suite's stopped database.
    .overrideProvider(PrismaService)
    .useValue(input.database)
    // Queue delivery is covered by worker integration tests. API HTTP workflow
    // tests should not open an unrelated long-lived Redis queue connection.
    .overrideProvider(SigningEmailQueue)
    .useValue({})
    .overrideProvider(QueueReadinessService)
    .useValue({ getStatus: () => ({ ready: true, target: 'test' }) })
    .compile();
  const app = module.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  }));
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.init();
  return app;
}
