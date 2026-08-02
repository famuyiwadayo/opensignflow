import {
  DocumentStatus,
  RecipientRole,
  RecipientStatus,
} from '@opensignflow/database';

import { ErrorCode } from '@/common';
import { DocumentFieldsService } from '../document-fields.service';

const now = new Date('2026-07-30T00:00:00.000Z');

function recipient(role: RecipientRole) {
  return {
    id: 'rcp_1',
    documentId: 'doc_1',
    name: 'Grace Hopper',
    email: 'grace@example.com',
    role,
    status: RecipientStatus.PENDING,
    signingOrder: 1,
    viewedAt: null,
    signedAt: null,
    declinedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

describe('DocumentFieldsService recipient ownership', () => {
  const documentsService = { getById: jest.fn() };
  const recipientsRepository = { findByIdForDocument: jest.fn() };
  const fieldsRepository = { create: jest.fn() };
  const auditService = { record: jest.fn() };
  const idGenerator = { generate: jest.fn().mockReturnValue('fld_1') };

  const service = new DocumentFieldsService(
    documentsService as never,
    recipientsRepository as never,
    fieldsRepository as never,
    auditService as never,
    idGenerator as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    documentsService.getById.mockResolvedValue({
      id: 'doc_1',
      organizationId: 'org_1',
      status: DocumentStatus.DRAFT,
      pageCount: 2,
    });
  });

  it('rejects assigning a document field to a CC recipient', async () => {
    recipientsRepository.findByIdForDocument.mockResolvedValue(
      recipient(RecipientRole.CC),
    );

    await expect(
      service.create({
        user: { id: 'usr_1', email: 'owner@example.com' },
        documentId: 'doc_1',
        context: {},
        dto: {
          recipientId: 'rcp_1',
          type: 'SIGNATURE',
          pageNumber: 1,
          x: 0.1,
          y: 0.1,
          width: 0.2,
          height: 0.1,
        },
      } as never),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ErrorCode.RECIPIENT_ROLE_NOT_ELIGIBLE,
      }),
    });

    expect(fieldsRepository.create).not.toHaveBeenCalled();
  });

  it('allows assigning a document field to a signer recipient', async () => {
    recipientsRepository.findByIdForDocument.mockResolvedValue(
      recipient(RecipientRole.SIGNER),
    );
    fieldsRepository.create.mockResolvedValue({
      id: 'fld_1',
      documentId: 'doc_1',
      recipientId: 'rcp_1',
      type: 'SIGNATURE',
      pageNumber: 1,
      x: { toNumber: () => 0.1 },
      y: { toNumber: () => 0.1 },
      width: { toNumber: () => 0.2 },
      height: { toNumber: () => 0.1 },
      required: true,
      label: null,
      placeholder: null,
      defaultValue: null,
      validation: null,
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.create({
      user: { id: 'usr_1', email: 'owner@example.com' },
      documentId: 'doc_1',
      context: {},
      dto: {
        recipientId: 'rcp_1',
        type: 'SIGNATURE',
        pageNumber: 1,
        x: 0.1,
        y: 0.1,
        width: 0.2,
        height: 0.1,
      },
    } as never);

    expect(result.recipientId).toBe('rcp_1');
    expect(fieldsRepository.create).toHaveBeenCalled();
    expect(auditService.record).toHaveBeenCalled();
  });
});
