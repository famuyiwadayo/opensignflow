import {
  DocumentStatus,
  RecipientRole,
  RecipientStatus,
} from '@opensignflow/database';

import { ErrorCode } from '@/common';
import { RecipientsService } from '../recipients.service';

const now = new Date('2026-07-29T00:00:00.000Z');

function recipient(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'rcp_signer',
    documentId: 'doc_1',
    name: 'Grace Hopper',
    email: 'grace@example.com',
    role: RecipientRole.SIGNER,
    status: RecipientStatus.PENDING,
    signingOrder: 1,
    viewedAt: null,
    signedAt: null,
    declinedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('RecipientsService role transitions', () => {
  const documentsService = { getById: jest.fn() };
  const recipientsRepository = {
    findByIdForDocument: jest.fn(),
    countFieldsForRecipient: jest.fn(),
    update: jest.fn(),
  };
  const auditService = { record: jest.fn() };
  const idGenerator = { generate: jest.fn() };
  const service = new RecipientsService(
    documentsService as never,
    recipientsRepository as never,
    auditService as never,
    idGenerator as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    documentsService.getById.mockResolvedValue({
      id: 'doc_1',
      organizationId: 'org_1',
      status: DocumentStatus.DRAFT,
    });
    recipientsRepository.findByIdForDocument.mockResolvedValue(recipient());
  });

  it('rejects changing a signer with assigned fields to CC', async () => {
    recipientsRepository.countFieldsForRecipient.mockResolvedValue(2);

    await expect(
      service.update({
        user: { id: 'usr_1', email: 'owner@example.com' },
        documentId: 'doc_1',
        recipientId: 'rcp_signer',
        dto: { role: RecipientRole.CC },
        context: {},
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ErrorCode.RECIPIENT_ROLE_CHANGE_REQUIRES_FIELD_REASSIGNMENT,
      }),
    });

    expect(recipientsRepository.update).not.toHaveBeenCalled();
  });

  it('allows changing a signer with no assigned fields to CC and audits the update', async () => {
    recipientsRepository.countFieldsForRecipient.mockResolvedValue(0);
    recipientsRepository.update.mockResolvedValue(
      recipient({ role: RecipientRole.CC }),
    );

    const result = await service.update({
      user: { id: 'usr_1', email: 'owner@example.com' },
      documentId: 'doc_1',
      recipientId: 'rcp_signer',
      dto: { role: RecipientRole.CC },
      context: {},
    });

    expect(result.role).toBe(RecipientRole.CC);
    expect(recipientsRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ role: RecipientRole.CC }),
    );
    expect(auditService.record).toHaveBeenCalled();
  });
});
