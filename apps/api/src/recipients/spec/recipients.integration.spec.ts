import { RecipientRole } from '@opensignflow/database';
import {
  createDocumentWorkflow,
  createTestDatabase,
  clearTestDatabase,
  migrateTestDatabase,
  startTestServices,
  type TestServices,
} from '@opensignflow/testkit';

import { ErrorCode, IdGeneratorService } from '@/common';
import { RecipientsRepository } from '../recipients.repository';
import { RecipientsService } from '../recipients.service';

jest.setTimeout(120_000);

describe('Recipient role workflow integration', () => {
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

  it('prevents signer downgrade while fields are assigned, then permits it after reassignment', async () => {
    const workflow = await createDocumentWorkflow({
      database,
      signerCount: 2,
      fieldsPerSigner: 1,
    });
    const documentsService = {
      getById: jest.fn().mockResolvedValue(workflow.document),
    };
    const auditService = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new RecipientsService(
      documentsService as never,
      new RecipientsRepository(database as never),
      auditService as never,
      new IdGeneratorService(),
    );

    await expect(
      service.update({
        user: { id: workflow.user.id, email: workflow.user.email },
        documentId: workflow.document.id,
        recipientId: workflow.signers[0].id,
        dto: { role: RecipientRole.CC },
        context: {},
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ErrorCode.RECIPIENT_ROLE_CHANGE_REQUIRES_FIELD_REASSIGNMENT,
      }),
    });

    await database.documentField.updateMany({
      where: { recipientId: workflow.signers[0].id },
      data: { recipientId: workflow.signers[1].id },
    });
    const updated = await service.update({
      user: { id: workflow.user.id, email: workflow.user.email },
      documentId: workflow.document.id,
      recipientId: workflow.signers[0].id,
      dto: { role: RecipientRole.CC },
      context: {},
    });

    expect(updated.role).toBe(RecipientRole.CC);
    expect(auditService.record).toHaveBeenCalledTimes(1);
  });
});
