import type { OnModuleDestroy } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { OutboxEventType } from '@opensignflow/database';
import { createQueue } from '@opensignflow/queue';
import {
  QueueJobName,
  QueueName,
  type OutboxPayloadEnvelope,
  type SendSigningEmailOutboxPayload,
} from '@opensignflow/shared';
import type { OutboxEventHandler } from '../outbox-handler.interface';

@Injectable()
export class SigningEmailOutboxHandler
  implements OutboxEventHandler<SendSigningEmailOutboxPayload>, OnModuleDestroy
{
  readonly type = OutboxEventType.SEND_SIGNING_EMAIL;

  private readonly queue = createQueue<SendSigningEmailOutboxPayload>({
    name: QueueName.SIGNING_EMAIL,
    redisUrl: required('REDIS_URL'),
    connectionName: 'worker-signing-email-outbox-handler',
    role: 'producer',
  });

  onModuleDestroy() {
    return this.queue.close();
  }

  parse(serializedPayload: string): SendSigningEmailOutboxPayload {
    const envelope = JSON.parse(serializedPayload) as OutboxPayloadEnvelope<
      OutboxEventType,
      SendSigningEmailOutboxPayload
    >;

    const payload = envelope?.payload;

    if (
      envelope.version !== 1 ||
      envelope.type !== this.type ||
      !payload ||
      [
        'signingRequestId',
        'documentId',
        'recipientId',
        'recipientEmail',
        'recipientName',
        'documentTitle',
        'signingToken',
      ].some(
        (field) =>
          typeof payload[field as keyof typeof payload] !== 'string' ||
          !payload[field as keyof typeof payload],
      )
    ) {
      throw new Error('Invalid SEND_SIGNING_EMAIL outbox payload.');
    }
    return payload;
  }

  async dispatch(input: { eventId: string; payload: SendSigningEmailOutboxPayload }) {
    return this.queue
      .add(QueueJobName.SEND_SIGNING_EMAIL, input.payload, {
        jobId: `signing-request-${input.payload.signingRequestId}`,
      })
      .then(() => undefined);
  }
}

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}
