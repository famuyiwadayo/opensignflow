import { Buffer } from 'node:buffer';

import { JwtService } from '@nestjs/jwt';
import { DocumentStatus, OrganizationRole } from '@opensignflow/database';
import request from 'supertest';
import {
  clearTestDatabase,
  createTestDatabase,
  documentFactory,
  migrateTestDatabase,
  organizationFactory,
  startTestServices,
  userFactory,
  type TestServices,
} from '@opensignflow/testkit';

import { createTestApi } from '@/test/create-test-api';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/database';

jest.setTimeout(120_000);
const encryptionKey = Buffer.alloc(32, 3).toString('base64');
const jwtSecret = 'test-access-secret-that-is-long-enough-for-validation';

describe('Document workflow HTTP integration', () => {
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
      JWT_ACCESS_SECRET: jwtSecret,
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
      ACCESS_TOKEN_TTL_SECONDS: '900',
      REFRESH_TOKEN_TTL_DAYS: '30',
    });
    app = await createTestApi({ database });
  });
  beforeEach(async () => {
    await clearTestDatabase(database);
  });
  afterAll(async () => {
    await app.close();
    await database.$disconnect();
    await services.stop();
  });

  it('creates signer/CC recipients, fields, and sends only signer work through HTTP', async () => {
    const user = userFactory();
    const organization = organizationFactory();
    const document = documentFactory({
      organizationId: organization.id,
      createdById: user.id,
    });
    await database.user.create({ data: user });
    await database.organization.create({ data: organization });
    await database.organizationMember.create({
      data: {
        id: 'mem_http',
        organizationId: organization.id,
        userId: user.id,
        role: OrganizationRole.OWNER,
      },
    });
    await database.document.create({ data: document });
    const token = new JwtService().sign(
      { sub: user.id, email: user.email, type: 'access' },
      { secret: jwtSecret, expiresIn: 900 },
    );
    const membershipKey = {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    };
    expect(
      await database.organizationMember.findUnique({ where: membershipKey }),
    ).not.toBeNull();
    expect(
      await app
        .get(PrismaService)
        .organizationMember.findUnique({ where: membershipKey }),
    ).not.toBeNull();
    const post = (path: string) =>
      request(app.getHttpServer())
        .post(path)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', organization.id);

    const signer = await post(`/v1/documents/${document.id}/recipients`)
      .send({
        name: 'Grace Hopper',
        email: 'grace@example.test',
        role: 'SIGNER',
      })
      .expect(201);
    const cc = await post(`/v1/documents/${document.id}/recipients`)
      .send({ name: 'Legal Team', email: 'legal@example.test', role: 'CC' })
      .expect(201);
    expect(signer.body.data.role).toBe('SIGNER');
    expect(cc.body.data.role).toBe('CC');

    await post(`/v1/documents/${document.id}/fields`)
      .send({
        recipientId: cc.body.data.id,
        type: 'SIGNATURE',
        pageNumber: 1,
        x: 0.1,
        y: 0.1,
        width: 0.2,
        height: 0.1,
      })
      .expect(422);
    const field = await post(`/v1/documents/${document.id}/fields`)
      .send({
        recipientId: signer.body.data.id,
        type: 'SIGNATURE',
        pageNumber: 1,
        x: 0.1,
        y: 0.1,
        width: 0.2,
        height: 0.1,
      })
      .expect(201);
    expect(field.body.data.recipientId).toBe(signer.body.data.id);

    await post(`/v1/documents/${document.id}/send`).send({}).expect(200);
    expect(
      (
        await database.document.findUniqueOrThrow({
          where: { id: document.id },
        })
      ).status,
    ).toBe(DocumentStatus.SENT);
    expect(
      await database.signingRequest.count({
        where: { documentId: document.id },
      }),
    ).toBe(1);
    expect(await database.outboxEvent.count()).toBe(1);
  });

  it('bulk assigns draft fields and blocks recipient or field mutation after send', async () => {
    const user = userFactory();
    const organization = organizationFactory();
    const document = documentFactory({
      organizationId: organization.id,
      createdById: user.id,
    });
    await database.user.create({ data: user });
    await database.organization.create({ data: organization });
    await database.organizationMember.create({
      data: {
        id: 'mem_http_mutation',
        organizationId: organization.id,
        userId: user.id,
        role: OrganizationRole.OWNER,
      },
    });
    await database.document.create({ data: document });
    const token = new JwtService().sign(
      { sub: user.id, email: user.email, type: 'access' },
      { secret: jwtSecret, expiresIn: 900 },
    );
    const post = (path: string) =>
      request(app.getHttpServer())
        .post(path)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', organization.id);
    const patch = (path: string) =>
      request(app.getHttpServer())
        .patch(path)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-Id', organization.id);
    const signerA = await post(`/v1/documents/${document.id}/recipients`)
      .send({ name: 'Signer A', email: 'a@example.test', role: 'SIGNER' })
      .expect(201);
    const signerB = await post(`/v1/documents/${document.id}/recipients`)
      .send({ name: 'Signer B', email: 'b@example.test', role: 'SIGNER' })
      .expect(201);
    const fieldA = await post(`/v1/documents/${document.id}/fields`)
      .send({
        recipientId: signerA.body.data.id,
        type: 'SIGNATURE',
        pageNumber: 1,
        x: 0.1,
        y: 0.1,
        width: 0.2,
        height: 0.1,
      })
      .expect(201);
    const fieldB = await post(`/v1/documents/${document.id}/fields`)
      .send({
        recipientId: signerA.body.data.id,
        type: 'DATE',
        pageNumber: 1,
        x: 0.4,
        y: 0.1,
        width: 0.2,
        height: 0.1,
      })
      .expect(201);

    const bulk = await patch(
      `/v1/documents/${document.id}/fields/bulk-assignment`,
    )
      .send({
        fieldIds: [fieldB.body.data.id],
        recipientId: signerB.body.data.id,
      })
      .expect(200);
    expect(
      bulk.body.data.every(
        (field: { recipientId: string }) =>
          field.recipientId === signerB.body.data.id,
      ),
    ).toBe(true);

    await post(`/v1/documents/${document.id}/send`).send({}).expect(200);
    await patch(
      `/v1/documents/${document.id}/recipients/${signerA.body.data.id}`,
    )
      .send({ name: 'Changed' })
      .expect(422);
    await patch(`/v1/documents/${document.id}/fields/${fieldA.body.data.id}`)
      .send({ label: 'Changed' })
      .expect(422);
  });
});
