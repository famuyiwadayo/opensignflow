import {
  createDocumentWorkflow,
  createTestDatabase,
  clearTestDatabase,
  migrateTestDatabase,
  startTestServices,
  type TestServices,
} from '@opensignflow/testkit';

import { ErrorCode, IdGeneratorService } from '@/common';
import { RecipientsRepository } from '@/recipients';
import { DocumentFieldsRepository } from '../document-fields.repository';
import { DocumentFieldsService } from '../document-fields.service';

jest.setTimeout(120_000);

describe('Document field bulk assignment integration', () => {
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

  async function createService(document: {
    id: string;
    organizationId: string;
    status: unknown;
    pageCount: number | null;
  }) {
    return new DocumentFieldsService(
      { getById: jest.fn().mockResolvedValue(document) } as never,
      new RecipientsRepository(database as never),
      new DocumentFieldsRepository(database as never),
      { record: jest.fn().mockResolvedValue(undefined) } as never,
      new IdGeneratorService(),
    );
  }

  it('atomically assigns every requested field to a signer and records one aggregate audit event', async () => {
    const workflow = await createDocumentWorkflow({
      database,
      signerCount: 2,
      fieldsPerSigner: 2,
    });
    const auditService = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new DocumentFieldsService(
      { getById: jest.fn().mockResolvedValue(workflow.document) } as never,
      new RecipientsRepository(database as never),
      new DocumentFieldsRepository(database as never),
      auditService as never,
      new IdGeneratorService(),
    );

    const result = await service.bulkAssign({
      user: { id: workflow.user.id, email: workflow.user.email },
      documentId: workflow.document.id,
      dto: {
        fieldIds: workflow.fields.map((field) => field.id),
        recipientId: workflow.signers[1].id,
      },
      context: {},
    });

    expect(result.data).toHaveLength(workflow.fields.length);
    expect(
      result.data.every(
        (field) => field.recipientId === workflow.signers[1].id,
      ),
    ).toBe(true);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ operation: 'BULK_ASSIGNMENT' }),
      }),
    );
  });

  it('rejects assigning fields to a CC recipient without mutating fields', async () => {
    const workflow = await createDocumentWorkflow({
      database,
      signerCount: 1,
      ccCount: 1,
      fieldsPerSigner: 1,
    });
    const service = await createService(workflow.document);

    await expect(
      service.bulkAssign({
        user: { id: workflow.user.id, email: workflow.user.email },
        documentId: workflow.document.id,
        dto: {
          fieldIds: workflow.fields.map((field) => field.id),
          recipientId: workflow.ccRecipients[0].id,
        },
        context: {},
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ErrorCode.RECIPIENT_ROLE_NOT_ELIGIBLE,
      }),
    });

    const persisted = await database.documentField.findUniqueOrThrow({
      where: { id: workflow.fields[0].id },
    });
    expect(persisted.recipientId).toBe(workflow.signers[0].id);
  });
});
