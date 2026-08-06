import { PDFDocument } from 'pdf-lib';

import { PdfFinalizationProcessor } from './pdf-finalization.processor';

describe('PdfFinalizationProcessor persistence workflow', () => {
  it('uploads completed PDF, persists hash/storage key, writes audit, and completes job progress', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([600, 800]);
    const original = await pdf.save();
    const storage = {
      getBytes: jest.fn().mockResolvedValue(original),
      upload: jest.fn().mockResolvedValue(undefined),
    };
    const updateDocument = jest.fn().mockResolvedValue(undefined);
    const createAudit = jest.fn().mockResolvedValue(undefined);
    const transaction = jest.fn(async (callback: (tx: unknown) => Promise<void>) =>
      callback({ document: { update: updateDocument }, auditEvent: { create: createAudit } }),
    );
    const prisma = {
      client: {
        document: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'doc_1',
            originalStorageKey: 'original.pdf',
            originalFileName: 'agreement.pdf',
          }),
        },
        documentFieldValue: { findMany: jest.fn().mockResolvedValue([]) },
        $transaction: transaction,
      },
    };
    const progress = { report: jest.fn().mockResolvedValue(undefined) };
    const processor = Object.create(PdfFinalizationProcessor.prototype) as PdfFinalizationProcessor;
    Object.assign(processor, { prisma, storage, progress });

    await (processor as unknown as { process(input: unknown): Promise<void> }).process({
      jobId: 'job_1',
      documentId: 'doc_1',
      organizationId: 'org_1',
    });

    expect(storage.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'organizations/org_1/documents/doc_1/completed/agreement.pdf',
        contentType: 'application/pdf',
      }),
    );
    expect(updateDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          completedStorageKey: expect.any(String),
          finalSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      }),
    );
    expect(createAudit).toHaveBeenCalled();
    expect(progress.report).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'COMPLETED', percent: 100 }),
    );
  });

  it('reports FAILED progress and rethrows processor errors', async () => {
    const storage = { getBytes: jest.fn().mockRejectedValue(new Error('Storage unavailable')) };
    const prisma = {
      client: {
        document: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'doc_1',
            originalStorageKey: 'original.pdf',
            originalFileName: 'agreement.pdf',
          }),
        },
        documentFieldValue: { findMany: jest.fn().mockResolvedValue([]) },
      },
    };
    const progress = { report: jest.fn().mockResolvedValue(undefined) };
    const processor = Object.create(PdfFinalizationProcessor.prototype) as PdfFinalizationProcessor;
    Object.assign(processor, { prisma, storage, progress });

    await expect(
      (processor as unknown as { process(input: unknown): Promise<void> }).process({
        jobId: 'job_1',
        documentId: 'doc_1',
        organizationId: 'org_1',
      }),
    ).rejects.toThrow('Storage unavailable');
    expect(progress.report).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'FAILED', phase: 'FAILED' }),
    );
  });
});
