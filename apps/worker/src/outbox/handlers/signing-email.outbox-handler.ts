import type { OnModuleDestroy } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { OutboxEventType } from '@opensignflow/database';
import { createQueue } from '@opensignflow/queue';
import { QueueJobName, QueueName, type SendSigningEmailOutboxPayload } from '@opensignflow/shared';
import type { OutboxEventHandler } from '../outbox-handler.interface';
import { signingEmailOutboxEnvelopeSchema } from '@opensignflow/validation';

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
    const parsed = signingEmailOutboxEnvelopeSchema.safeParse(JSON.parse(serializedPayload));
    if (!parsed.success) {
      throw new Error('Invalid SEND_SIGNING_EMAIL outbox payload.');
    }
    return parsed.data.payload;
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
