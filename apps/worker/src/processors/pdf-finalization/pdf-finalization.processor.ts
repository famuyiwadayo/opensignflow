import { createHash, randomUUID } from 'node:crypto';

import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Inject, Injectable } from '@nestjs/common';
import type { DocumentField } from '@opensignflow/database';
import { AuditActorType, AuditEventType } from '@opensignflow/database';
import { createWorker } from '@opensignflow/queue';
import {
  ID_PREFIXES,
  QueueName,
  type FinalizeCompletedDocumentOutboxPayload,
  type JobProgressEvent,
} from '@opensignflow/shared';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

import { WorkerPrismaService } from '../../database/worker-prisma.service';
import { JobProgressService } from '../../jobs/job-progress.service';
import { WorkerStorageService } from '../../storage/worker-storage.service';

@Injectable()
export class PdfFinalizationProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly worker = createWorker<FinalizeCompletedDocumentOutboxPayload>({
    name: QueueName.PDF_FINALIZATION,
    redisUrl: required('REDIS_URL'),
    connectionName: 'worker-pdf-finalization-consumer',
    role: 'consumer',
    processor: async (payload) => this.process(payload),
  });

  constructor(
    @Inject(WorkerPrismaService) private readonly prisma: WorkerPrismaService,
    @Inject(WorkerStorageService) private readonly storage: WorkerStorageService,
    @Inject(JobProgressService) private readonly progress: JobProgressService,
  ) {}

  async onModuleInit() {
    await this.worker.waitUntilReady();
  }
  onModuleDestroy() {
    return this.worker.close();
  }

  private async process(payload: FinalizeCompletedDocumentOutboxPayload) {
    try {
      await this.report(payload, 'PROCESSING', 'DOWNLOADING', 5, 'Downloading original PDF');
      const document = await this.prisma.client.document.findUniqueOrThrow({
        where: { id: payload.documentId },
      });
      const values = await this.prisma.client.documentFieldValue.findMany({
        where: { documentId: payload.documentId },
        include: { field: true },
        orderBy: { createdAt: 'asc' },
      });
      const original = await this.storage.getBytes(document.originalStorageKey);
      await this.report(
        payload,
        'PROCESSING',
        'LOADING_VALUES',
        20,
        'Loading completed field values',
      );
      const pdf = await PDFDocument.load(original);
      const textFont = await pdf.embedFont(StandardFonts.Helvetica);
      const signatureFont = await pdf.embedFont(StandardFonts.TimesRomanItalic);

      await this.report(payload, 'PROCESSING', 'RENDERING', 45, 'Rendering signer fields');
      for (const fieldValue of values) {
        this.renderField(pdf, fieldValue.field, fieldValue.value, textFont, signatureFont);
      }

      const completed = await pdf.save();
      const finalSha256 = createHash('sha256').update(completed).digest('hex');
      const key = `organizations/${payload.organizationId}/documents/${payload.documentId}/completed/${document.originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      await this.report(payload, 'PROCESSING', 'UPLOADING', 80, 'Uploading completed PDF');
      await this.storage.upload({
        key,
        body: completed,
        contentType: 'application/pdf',
        contentLength: completed.length,
      });
      await this.prisma.client.$transaction(async (tx) => {
        await tx.document.update({
          where: { id: document.id },
          data: { completedStorageKey: key, finalSha256 },
        });
        await tx.auditEvent.create({
          data: {
            id: `${ID_PREFIXES.auditEvent}_${randomUUID().replace(/-/g, '').slice(0, 22)}`,
            organizationId: payload.organizationId,
            documentId: document.id,
            actorType: AuditActorType.SYSTEM,
            eventType: AuditEventType.FINAL_PDF_GENERATED,
            metadata: { completedStorageKey: key, finalSha256 },
          },
        });
      });
      await this.report(payload, 'COMPLETED', 'COMPLETED', 100, 'Completed PDF generated');
    } catch (error) {
      await this.report(payload, 'FAILED', 'FAILED', 100, 'PDF finalization failed');
      throw error;
    }
  }

  private renderField(
    pdf: PDFDocument,
    field: DocumentField,
    value: unknown,
    textFont: any,
    signatureFont: any,
  ) {
    const pageIndex = field.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pdf.getPageCount()) {
      throw new Error(`Field page ${field.pageNumber} does not exist.`);
    }
    const page = pdf.getPage(pageIndex);
    const width = field.width.toNumber() * page.getWidth();
    const height = field.height.toNumber() * page.getHeight();
    const x = field.x.toNumber() * page.getWidth();
    const y = page.getHeight() - field.y.toNumber() * page.getHeight() - height;
    if (field.type === 'CHECKBOX') {
      if (value === true) {
        page.drawLine({
          start: { x: x + width * 0.15, y: y + height * 0.45 },
          end: { x: x + width * 0.42, y: y + height * 0.15 },
          thickness: 2,
          color: rgb(0, 0, 0),
        });
        page.drawLine({
          start: { x: x + width * 0.42, y: y + height * 0.15 },
          end: { x: x + width * 0.85, y: y + height * 0.85 },
          thickness: 2,
          color: rgb(0, 0, 0),
        });
      }
      return;
    }
    const text =
      field.type === 'SIGNATURE' && isTypedSignature(value) ? value.name : String(value ?? '');
    const font = field.type === 'SIGNATURE' ? signatureFont : textFont;
    const size = Math.max(8, Math.min(18, height * 0.55));
    page.drawText(text, {
      x: x + 2,
      y: y + Math.max(2, (height - size) / 2),
      size,
      font,
      color: rgb(0, 0, 0),
      maxWidth: Math.max(1, width - 4),
    });
  }

  private report(
    payload: FinalizeCompletedDocumentOutboxPayload,
    status: JobProgressEvent['status'],
    phase: string,
    percent: number,
    message: string,
  ) {
    return this.progress.report({
      jobId: payload.jobId,
      resourceType: 'DOCUMENT',
      resourceId: payload.documentId,
      status,
      phase,
      percent,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}

function isTypedSignature(value: unknown): value is { type: 'TYPED_NAME'; name: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>).type === 'TYPED_NAME' &&
    typeof (value as Record<string, unknown>).name === 'string'
  );
}

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}
