import { createHash } from 'node:crypto';

import {
  DocumentFieldType,
  SigningRequestStatus,
} from '@opensignflow/database';
import {
  createDocumentWorkflow,
  createTestDatabase,
  clearTestDatabase,
  migrateTestDatabase,
  startTestServices,
  type TestServices,
} from '@opensignflow/testkit';

import { IdGeneratorService } from '@/common';
import { PublicSigningService } from '../public-signing.service';

jest.setTimeout(120_000);

describe('PublicSigningService integration', () => {
  let services: TestServices;
  let database: ReturnType<typeof createTestDatabase>;
  beforeAll(async () => {
    services = await startTestServices();
    migrateTestDatabase(services.databaseUrl);
    database = createTestDatabase(services.databaseUrl);
    await database.$connect();
  });
  beforeEach(async () => {
    await clearTestDatabase(database);
  });
  afterAll(async () => {
    await database.$disconnect();
    await services.stop();
  });

  it('returns only recipient-owned fields and completes a valid submission', async () => {
    const workflow = await createDocumentWorkflow({
      database,
      signerCount: 2,
      fieldsPerSigner: 1,
    });
    const token = 'public-token-a';
    const request = await database.signingRequest.create({
      data: {
        id: 'sreq_a',
        documentId: workflow.document.id,
        recipientId: workflow.signers[0].id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await database.signingRequest.create({
      data: {
        id: 'sreq_b',
        documentId: workflow.document.id,
        recipientId: workflow.signers[1].id,
        tokenHash: createHash('sha256').update('public-token-b').digest('hex'),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new PublicSigningService(
      database as never,
      audit as never,
      new IdGeneratorService(),
      {
        getOrThrow: (name: string) =>
          name === 'OUTBOX_ENCRYPTION_KEY'
            ? Buffer.alloc(32, 5).toString('base64')
            : 'test-v1',
      } as never,
    );

    const view = await service.getByToken(token, {});
    expect(view.fields).toHaveLength(1);
    expect(view.fields[0].id).toBe(workflow.fields[0].id);
    expect(view.status).toBe(SigningRequestStatus.VIEWED);

    await service.submit(
      token,
      {
        values: [
          {
            fieldId: workflow.fields[0].id,
            value: { type: 'TYPED_NAME', name: 'Grace Hopper' },
          },
        ],
      },
      {},
    );
    const persistedRequest = await database.signingRequest.findUniqueOrThrow({
      where: { id: request.id },
    });
    const values = await database.documentFieldValue.findMany({
      where: { documentId: workflow.document.id },
    });
    expect(persistedRequest.status).toBe(SigningRequestStatus.COMPLETED);
    expect(values).toHaveLength(1);
  });

  it.each([
    [
      'expired',
      SigningRequestStatus.PENDING,
      new Date(Date.now() - 60_000),
      'SIGNING_TOKEN_EXPIRED',
    ],
    [
      'revoked',
      SigningRequestStatus.REVOKED,
      new Date(Date.now() + 60_000),
      'SIGNING_REQUEST_REVOKED',
    ],
    [
      'completed',
      SigningRequestStatus.COMPLETED,
      new Date(Date.now() + 60_000),
      'SIGNING_ALREADY_SUBMITTED',
    ],
  ])(
    'rejects %s signing requests',
    async (_label, status, expiresAt, errorCode) => {
      const workflow = await createDocumentWorkflow({
        database,
        signerCount: 1,
        fieldsPerSigner: 1,
      });
      const token = `public-token-${status}`;
      await database.signingRequest.create({
        data: {
          id: `sreq_${status}`,
          documentId: workflow.document.id,
          recipientId: workflow.signers[0].id,
          tokenHash: createHash('sha256').update(token).digest('hex'),
          status,
          expiresAt,
        },
      });
      const service = new PublicSigningService(
        database as never,
        { record: jest.fn() } as never,
        new IdGeneratorService(),
        {
          getOrThrow: (name: string) =>
            name === 'OUTBOX_ENCRYPTION_KEY'
              ? Buffer.alloc(32, 5).toString('base64')
              : 'test-v1',
        } as never,
      );

      await expect(service.getByToken(token, {})).rejects.toMatchObject({
        response: expect.objectContaining({ code: errorCode }),
      });
    },
  );

  it('completes the document when the final signer submits required fields', async () => {
    const workflow = await createDocumentWorkflow({
      database,
      signerCount: 2,
      fieldsPerSigner: 1,
    });
    const tokenA = 'complete-token-a';
    const tokenB = 'complete-token-b';
    await database.signingRequest.createMany({
      data: [
        {
          id: 'sreq_complete_a',
          documentId: workflow.document.id,
          recipientId: workflow.signers[0].id,
          tokenHash: createHash('sha256').update(tokenA).digest('hex'),
          expiresAt: new Date(Date.now() + 60_000),
        },
        {
          id: 'sreq_complete_b',
          documentId: workflow.document.id,
          recipientId: workflow.signers[1].id,
          tokenHash: createHash('sha256').update(tokenB).digest('hex'),
          expiresAt: new Date(Date.now() + 60_000),
        },
      ],
    });
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new PublicSigningService(
      database as never,
      audit as never,
      new IdGeneratorService(),
      {
        getOrThrow: (name: string) =>
          name === 'OUTBOX_ENCRYPTION_KEY'
            ? Buffer.alloc(32, 5).toString('base64')
            : 'test-v1',
      } as never,
    );

    await service.submit(
      tokenA,
      {
        values: [
          {
            fieldId: workflow.fields[0].id,
            value: { type: 'TYPED_NAME', name: 'Signer A' },
          },
        ],
      },
      {},
    );
    expect(
      (
        await database.document.findUniqueOrThrow({
          where: { id: workflow.document.id },
        })
      ).status,
    ).not.toBe('COMPLETED');
    await service.submit(
      tokenB,
      {
        values: [
          {
            fieldId: workflow.fields[1].id,
            value: { type: 'TYPED_NAME', name: 'Signer B' },
          },
        ],
      },
      {},
    );

    const document = await database.document.findUniqueOrThrow({
      where: { id: workflow.document.id },
    });
    expect(document.status).toBe('COMPLETED');
    expect(document.completedAt).not.toBeNull();
    expect(audit.record).toHaveBeenCalledTimes(3);
    const finalizationEvents = await database.outboxEvent.findMany({
      where: {
        type: 'FINALIZE_COMPLETED_DOCUMENT',
        resourceId: workflow.document.id,
      },
    });
    expect(finalizationEvents).toHaveLength(1);
  });

  it('rejects submission of a field owned by another signer', async () => {
    const workflow = await createDocumentWorkflow({
      database,
      signerCount: 2,
      fieldsPerSigner: 1,
    });
    const token = 'public-token-a';
    await database.signingRequest.create({
      data: {
        id: 'sreq_a',
        documentId: workflow.document.id,
        recipientId: workflow.signers[0].id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const service = new PublicSigningService(
      database as never,
      { record: jest.fn() } as never,
      new IdGeneratorService(),
      {
        getOrThrow: (name: string) =>
          name === 'OUTBOX_ENCRYPTION_KEY'
            ? Buffer.alloc(32, 5).toString('base64')
            : 'test-v1',
      } as never,
    );

    await expect(
      service.submit(
        token,
        {
          values: [
            {
              fieldId: workflow.fields[1].id,
              value: { signature: 'forbidden' },
            },
          ],
        },
        {},
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SIGNING_SUBMISSION_INVALID' }),
    });
    expect(await database.signingSubmission.count()).toBe(0);
  });
});
