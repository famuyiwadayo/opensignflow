import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { OutboxEventType } from '@opensignflow/database';
import { createQueue } from '@opensignflow/queue';
import {
  QueueJobName,
  QueueName,
  type FinalizeCompletedDocumentOutboxPayload,
} from '@opensignflow/shared';
import { pdfFinalizationOutboxEnvelopeSchema } from '@opensignflow/validation';

import type { OutboxEventHandler } from '../outbox-handler.interface';

@Injectable()
export class PdfFinalizationOutboxHandler
  implements OutboxEventHandler<FinalizeCompletedDocumentOutboxPayload>, OnModuleDestroy
{
  readonly type = OutboxEventType.FINALIZE_COMPLETED_DOCUMENT;

  private readonly queue = createQueue<FinalizeCompletedDocumentOutboxPayload>({
    name: QueueName.PDF_FINALIZATION,
    redisUrl: required('REDIS_URL'),
    connectionName: 'worker-pdf-finalization-outbox-handler',
    role: 'producer',
  });

  parse(serializedPayload: string): FinalizeCompletedDocumentOutboxPayload {
    const parsed = pdfFinalizationOutboxEnvelopeSchema.safeParse(JSON.parse(serializedPayload));
    if (!parsed.success) {
      throw new Error('Invalid FINALIZE_COMPLETED_DOCUMENT outbox payload.');
    }
    return parsed.data.payload;
  }

  dispatch(input: { eventId: string; payload: FinalizeCompletedDocumentOutboxPayload }) {
    return this.queue
      .add(QueueJobName.FINALIZE_COMPLETED_DOCUMENT, input.payload, {
        jobId: `document-finalization-${input.payload.documentId}`,
      })
      .then(() => undefined);
  }

  onModuleDestroy() {
    return this.queue.close();
  }
}

function required(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
