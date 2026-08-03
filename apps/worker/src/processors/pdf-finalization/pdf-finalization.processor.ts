import { createHash, randomUUID } from 'node:crypto';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Inject, Injectable } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import { AuditActorType, AuditEventType } from '@opensignflow/database';
import { createWorker } from '@opensignflow/queue';
import {
  ID_PREFIXES,
  QueueName,
  type FinalizeCompletedDocumentOutboxPayload,
  type JobProgressEvent,
} from '@opensignflow/shared';
import { WorkerPrismaService } from '@/database';
import { JobProgressService } from '@/jobs';
import { WorkerStorageService } from '@/storage';

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
    await this.report(payload, 'PROCESSING', 'DOWNLOADING', 5, 'Downloading original PDF');
    const document = await this.prisma.client.document.findUniqueOrThrow({
      where: { id: payload.documentId },
    });
    const original = await this.storage.getBytes(document.originalStorageKey);
    await this.report(payload, 'PROCESSING', 'RENDERING', 45, 'Preparing completed PDF');
    const pdf = await PDFDocument.load(original);
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

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}
