import 'reflect-metadata';
import { Buffer } from 'node:buffer';

import {
  HttpStatus,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import {
  clearTestDatabase,
  createTestDatabase,
  migrateTestDatabase,
  startTestServices,
  type TestServices,
} from '@opensignflow/testkit';

import { ApiExceptionFilter } from '@/common/filters';
import { AuthController } from '../auth.controller';
import { RegisterDto } from '../dto/register.dto';

jest.setTimeout(120_000);

const encryptionKey = Buffer.alloc(32, 6).toString('base64');

describe('Auth HTTP integration', () => {
  let services: TestServices;
  let database: ReturnType<typeof createTestDatabase>;
  let app: INestApplication;

  beforeAll(async () => {
    services = await startTestServices();
    migrateTestDatabase(services.databaseUrl);
    database = createTestDatabase(services.databaseUrl);
    await database.$connect();

    Object.assign(process.env, {
      NODE_ENV: 'test',
      DATABASE_URL: services.databaseUrl,
      REDIS_URL: services.redisUrl,
      JWT_ACCESS_SECRET:
        'test-access-secret-that-is-long-enough-for-validation',
      JWT_REFRESH_SECRET:
        'test-refresh-secret-that-is-long-enough-for-validation',
      OUTBOX_ENCRYPTION_KEY: encryptionKey,
      OUTBOX_ENCRYPTION_KEY_VERSION: 'test-v1',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_REGION: 'us-east-1',
      S3_BUCKET: 'test-bucket',
      S3_ACCESS_KEY_ID: 'test',
      S3_SECRET_ACCESS_KEY: 'test-secret',
      S3_FORCE_PATH_STYLE: 'true',
      WEB_APP_URL: 'http://localhost:3000',
      API_PORT: '4000',
      ACCESS_TOKEN_TTL_SECONDS: '900',
      REFRESH_TOKEN_TTL_DAYS: '30',
    });

    // AppModule loads environment while imported; require only after test env is ready.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AppModule } = require('../../app.module');
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    // Mirror the production API bootstrap validation contract.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    );
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
  });

  beforeEach(async () => {
    await clearTestDatabase(database);
  });

  afterAll(async () => {
    await app.close();
    await database.$disconnect();
    await services.stop();
  });

  it('registers, logs in, refreshes, accesses /me, and logs out through HTTP', async () => {
    const registration = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        name: 'Grace Hopper',
        email: 'grace@example.test',
        password: 'correct-horse-battery-staple',
      })
      .expect(201);
    expect(registration.body.data.user.email).toBe('grace@example.test');
    expect(registration.headers['set-cookie'][0]).toContain(
      'opensignflow_refresh_token=',
    );

    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: ' GRACE@EXAMPLE.TEST ',
        password: 'correct-horse-battery-staple',
      })
      .expect(200);
    const loginCookie = login.headers['set-cookie'][0];
    const accessToken = login.body.data.accessToken;

    const me = await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(me.body.data.user.email).toBe('grace@example.test');

    const refreshed = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .set('Cookie', loginCookie)
      .expect(200);
    expect(refreshed.body.data.accessToken).toBeTruthy();
    const refreshCookie = refreshed.headers['set-cookie'][0];
    expect(refreshCookie).not.toBe(loginCookie);

    await request(app.getHttpServer())
      .post('/v1/auth/logout')
      .set('Cookie', refreshCookie)
      .expect(200)
      .expect(({ body }) => expect(body.data.success).toBe(true));

    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(401)
      .expect(({ body }) =>
        expect(body.error.code).toBe('REFRESH_TOKEN_INVALID'),
      );
  });

  // it('emits RegisterDto metadata for Nest validation', () => {
  //   const parameterTypes = Reflect.getMetadata(
  //     'design:paramtypes',
  //     AuthController.prototype,
  //     'register',
  //   ) as unknown[];
  //   expect(parameterTypes[0]).toBe(RegisterDto);
  // });

  it('returns validation and authentication error envelopes', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ name: 'G', email: 'invalid', password: 'short' })
      .expect(422)
      .expect(({ body }) => expect(body.error.code).toBe('VALIDATION_ERROR'));

    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'missing@example.test', password: 'incorrect' })
      .expect(401)
      .expect(({ body }) =>
        expect(body.error.code).toBe('INVALID_CREDENTIALS'),
      );
  });
});
