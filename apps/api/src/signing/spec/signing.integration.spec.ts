import { createHash } from 'node:crypto';

import { decryptPayload } from '@opensignflow/crypto';
import {
  DocumentFieldType,
  DocumentStatus,
  OrganizationRole,
  RecipientRole,
  RecipientStatus,
} from '@opensignflow/database';
import {
  createTestDatabase,
  clearTestDatabase,
  documentFactory,
  documentFieldFactory,
  migrateTestDatabase,
  organizationFactory,
  recipientFactory,
  startTestServices,
  userFactory,
  type TestServices,
} from '@opensignflow/testkit';

import { SigningService } from '../signing.service';

jest.setTimeout(120_000);

const encryptionKey = Buffer.alloc(32, 9).toString('base64');

describe('SigningService send transaction', () => {
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

  it('creates signing requests and encrypted outbox events only for signer recipients', async () => {
    const user = userFactory();
    const organization = organizationFactory();
    const document = documentFactory({
      organizationId: organization.id,
      createdById: user.id,
    });
    const signer = recipientFactory({
      documentId: document.id,
      email: 'signer@example.test',
      role: RecipientRole.SIGNER,
    });
    const cc = recipientFactory({
      documentId: document.id,
      email: 'cc@example.test',
      role: RecipientRole.CC,
    });
    const field = documentFieldFactory({
      documentId: document.id,
      recipientId: signer.id,
      type: DocumentFieldType.SIGNATURE,
    });

    await database.user.create({ data: user });
    await database.organization.create({ data: organization });
    await database.organizationMember.create({
      data: {
        id: 'mem_test',
        organizationId: organization.id,
        userId: user.id,
        role: OrganizationRole.OWNER,
      },
    });
    await database.document.create({ data: document });
    await database.recipient.createMany({ data: [signer, cc] });
    await database.documentField.create({ data: field });

    let sequence = 0;
    const auditService = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new SigningService(
      { getById: jest.fn().mockResolvedValue(document) } as never,
      database as never,
      {
        generate: (name: string) => `${name}_integration_${++sequence}`,
      } as never,
      auditService as never,
      {
        getOrThrow: (name: string) =>
          name === 'OUTBOX_ENCRYPTION_KEY' ? encryptionKey : 'test-v1',
      } as never,
    );

    await service.send({
      user: { id: user.id, email: user.email },
      documentId: document.id,
      context: {},
    });

    const requests = await database.signingRequest.findMany({
      orderBy: { recipientId: 'asc' },
    });
    const outboxEvents = await database.outboxEvent.findMany({
      orderBy: { resourceId: 'asc' },
    });
    const persistedDocument = await database.document.findUniqueOrThrow({
      where: { id: document.id },
    });
    const persistedRecipients = await database.recipient.findMany({
      where: { documentId: document.id },
      orderBy: { email: 'asc' },
    });

    expect(persistedDocument.status).toBe(DocumentStatus.SENT);
    expect(requests).toHaveLength(1);
    expect(requests[0].recipientId).toBe(signer.id);
    expect(requests[0].tokenHash).toHaveLength(64);
    expect(outboxEvents).toHaveLength(1);
    expect(outboxEvents[0].resourceId).toBe(requests[0].id);
    expect(
      persistedRecipients.find((recipient) => recipient.id === signer.id)
        ?.status,
    ).toBe(RecipientStatus.SENT);
    expect(
      persistedRecipients.find((recipient) => recipient.id === cc.id)?.status,
    ).toBe(RecipientStatus.PENDING);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          signerCount: 1,
          ccCount: 1,
          fieldCount: 1,
        }),
      }),
      expect.anything(),
    );

    const encrypted = JSON.parse(outboxEvents[0].encryptedPayload);
    const payload = JSON.parse(
      decryptPayload({ ...encrypted, base64Key: encryptionKey }),
    );
    expect(payload.payload.signingRequestId).toBe(requests[0].id);
    expect(payload.payload.recipientId).toBe(signer.id);
    expect(payload.payload.recipientEmail).toBe(signer.email);
    expect(payload.payload.signingToken).toBeDefined();
    expect(
      createHash('sha256').update(payload.payload.signingToken).digest('hex'),
    ).toBe(requests[0].tokenHash);
  });

  it.each([
    ['has no signer recipients', [RecipientRole.CC], []],
    [
      'has a signer without fields',
      [RecipientRole.SIGNER, RecipientRole.SIGNER],
      [0],
    ],
    [
      'has a field assigned to a CC recipient',
      [RecipientRole.SIGNER, RecipientRole.CC],
      [1],
    ],
  ])(
    'does not mutate a DRAFT document when it %s',
    async (_label, roles, fieldRecipientIndexes) => {
      const user = userFactory();
      const organization = organizationFactory();
      const document = documentFactory({
        organizationId: organization.id,
        createdById: user.id,
      });
      const recipients = roles.map((role, index) =>
        recipientFactory({
          documentId: document.id,
          email: `invalid-${index}@example.test`,
          role,
        }),
      );
      await database.user.create({ data: user });
      await database.organization.create({ data: organization });
      await database.organizationMember.create({
        data: {
          id: `mem_invalid_${roles.length}`,
          organizationId: organization.id,
          userId: user.id,
          role: OrganizationRole.OWNER,
        },
      });
      await database.document.create({ data: document });
      await database.recipient.createMany({ data: recipients });

      if (fieldRecipientIndexes.length) {
        await database.documentField.createMany({
          data: fieldRecipientIndexes.map((index, fieldIndex) =>
            documentFieldFactory({
              documentId: document.id,
              recipientId: recipients[index].id,
              x: 0.1 + fieldIndex * 0.3,
            }),
          ),
        });
      }

      const service = new SigningService(
        { getById: jest.fn().mockResolvedValue(document) } as never,
        database as never,
        { generate: (name: string) => `${name}_invalid` } as never,
        { record: jest.fn() } as never,
        {
          getOrThrow: (name: string) =>
            name === 'OUTBOX_ENCRYPTION_KEY' ? encryptionKey : 'test-v1',
        } as never,
      );

      await expect(
        service.send({
          user: { id: user.id, email: user.email },
          documentId: document.id,
          context: {},
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'DOCUMENT_SEND_REQUIREMENTS_NOT_MET',
        }),
      });
      expect(
        (
          await database.document.findUniqueOrThrow({
            where: { id: document.id },
          })
        ).status,
      ).toBe(DocumentStatus.DRAFT);
      expect(
        await database.signingRequest.count({
          where: { documentId: document.id },
        }),
      ).toBe(0);
      expect(await database.outboxEvent.count()).toBe(0);
    },
  );

  it('creates one signing request and one outbox event for every eligible signer', async () => {
    const user = userFactory();
    const organization = organizationFactory();
    const document = documentFactory({
      organizationId: organization.id,
      createdById: user.id,
    });
    const signerA = recipientFactory({
      documentId: document.id,
      email: 'a@example.test',
      role: RecipientRole.SIGNER,
    });
    const signerB = recipientFactory({
      documentId: document.id,
      email: 'b@example.test',
      role: RecipientRole.SIGNER,
      signingOrder: 2,
    });
    const cc = recipientFactory({
      documentId: document.id,
      email: 'cc@example.test',
      role: RecipientRole.CC,
    });
    await database.user.create({ data: user });
    await database.organization.create({ data: organization });
    await database.organizationMember.create({
      data: {
        id: 'mem_multi',
        organizationId: organization.id,
        userId: user.id,
        role: OrganizationRole.OWNER,
      },
    });
    await database.document.create({ data: document });
    await database.recipient.createMany({ data: [signerA, signerB, cc] });
    await database.documentField.createMany({
      data: [
        documentFieldFactory({
          documentId: document.id,
          recipientId: signerA.id,
        }),
        documentFieldFactory({
          documentId: document.id,
          recipientId: signerB.id,
          x: 0.4,
        }),
      ],
    });
    let sequence = 0;
    const auditService = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new SigningService(
      { getById: jest.fn().mockResolvedValue(document) } as never,
      database as never,
      { generate: (name: string) => `${name}_multi_${++sequence}` } as never,
      auditService as never,
      {
        getOrThrow: (name: string) =>
          name === 'OUTBOX_ENCRYPTION_KEY' ? encryptionKey : 'test-v1',
      } as never,
    );

    await service.send({
      user: { id: user.id, email: user.email },
      documentId: document.id,
      context: {},
    });

    const requests = await database.signingRequest.findMany({
      where: { documentId: document.id },
    });
    const events = await database.outboxEvent.findMany({
      where: { resourceId: { in: requests.map((request) => request.id) } },
    });
    expect(requests.map((request) => request.recipientId).sort()).toEqual(
      [signerA.id, signerB.id].sort(),
    );
    expect(events).toHaveLength(2);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          signerCount: 2,
          ccCount: 1,
          fieldCount: 2,
        }),
      }),
      expect.anything(),
    );
  });
});
