import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { OutboxEventType } from '@opensignflow/database';
import { createQueue } from '@opensignflow/queue';
import {
  QueueJobName,
  QueueName,
  type FinalizeCompletedDocumentOutboxPayload,
  type OutboxPayloadEnvelope,
} from '@opensignflow/shared';

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
    const envelope = JSON.parse(serializedPayload) as OutboxPayloadEnvelope<
      'FINALIZE_COMPLETED_DOCUMENT',
      FinalizeCompletedDocumentOutboxPayload
    >;

    if (
      envelope.version !== 1 ||
      envelope.type !== this.type ||
      !envelope.payload?.jobId ||
      !envelope.payload?.documentId ||
      !envelope.payload?.organizationId
    ) {
      throw new Error('Invalid FINALIZE_COMPLETED_DOCUMENT outbox payload.');
    }

    return envelope.payload;
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
