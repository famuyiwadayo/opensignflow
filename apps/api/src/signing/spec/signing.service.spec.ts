import { DocumentStatus, RecipientRole } from '@opensignflow/database';

import { ErrorCode } from '@/common';
import { SigningService } from '../signing.service';

describe('SigningService send eligibility', () => {
  const documentsService = { getById: jest.fn() };
  const prisma = {
    recipient: { findMany: jest.fn() },
    documentField: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const idGenerator = { generate: jest.fn() };
  const auditService = { record: jest.fn() };
  const config = { getOrThrow: jest.fn() };
  const service = new SigningService(
    documentsService as never,
    prisma as never,
    idGenerator as never,
    auditService as never,
    config as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    documentsService.getById.mockResolvedValue({
      id: 'doc_1',
      organizationId: 'org_1',
      title: 'Service Agreement',
      status: DocumentStatus.DRAFT,
    });
  });

  it('rejects sending a document that has no signer recipients', async () => {
    prisma.recipient.findMany.mockResolvedValue([
      {
        id: 'rcp_cc',
        name: 'Legal Team',
        email: 'legal@example.com',
        role: RecipientRole.CC,
      },
    ]);
    prisma.documentField.findMany.mockResolvedValue([]);

    await expect(
      service.send({
        user: { id: 'usr_1', email: 'owner@example.com' },
        documentId: 'doc_1',
        context: {},
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ErrorCode.DOCUMENT_SEND_REQUIREMENTS_NOT_MET,
      }),
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects sending when a signer has no assigned field', async () => {
    prisma.recipient.findMany.mockResolvedValue([
      {
        id: 'rcp_signer_a',
        name: 'Grace Hopper',
        email: 'grace@example.com',
        role: RecipientRole.SIGNER,
      },
      {
        id: 'rcp_signer_b',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        role: RecipientRole.SIGNER,
      },
      {
        id: 'rcp_cc',
        name: 'Legal Team',
        email: 'legal@example.com',
        role: RecipientRole.CC,
      },
    ]);
    prisma.documentField.findMany.mockResolvedValue([
      { recipientId: 'rcp_signer_a' },
    ]);

    await expect(
      service.send({
        user: { id: 'usr_1', email: 'owner@example.com' },
        documentId: 'doc_1',
        context: {},
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ErrorCode.DOCUMENT_SEND_REQUIREMENTS_NOT_MET,
      }),
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a field assigned to a CC recipient before opening a transaction', async () => {
    prisma.recipient.findMany.mockResolvedValue([
      {
        id: 'rcp_signer',
        name: 'Grace Hopper',
        email: 'grace@example.com',
        role: RecipientRole.SIGNER,
      },
      {
        id: 'rcp_cc',
        name: 'Legal Team',
        email: 'legal@example.com',
        role: RecipientRole.CC,
      },
    ]);
    prisma.documentField.findMany.mockResolvedValue([
      { recipientId: 'rcp_cc' },
    ]);

    await expect(
      service.send({
        user: { id: 'usr_1', email: 'owner@example.com' },
        documentId: 'doc_1',
        context: {},
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ErrorCode.DOCUMENT_SEND_REQUIREMENTS_NOT_MET,
      }),
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
