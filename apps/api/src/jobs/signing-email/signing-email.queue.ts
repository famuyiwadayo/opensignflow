import type { OnModuleDestroy } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { createQueue } from '@opensignflow/queue';
import {
  QueueJobName,
  QueueName,
  type SendSigningEmailJob,
} from '@opensignflow/shared';

const ENQUEUE_TIMEOUT_MS = 5_000;

/** Raised when Redis cannot accept a signing-email job within the bounded API timeout. */
export class SigningEmailQueueUnavailableError extends Error {
  constructor() {
    super('Signing email queue is unavailable.');
    this.name = SigningEmailQueueUnavailableError.name;
  }
}

@Injectable()
export class SigningEmailQueue implements OnModuleDestroy {
  private readonly logger = new Logger(SigningEmailQueue.name);
  private readonly queue: ReturnType<typeof createQueue<SendSigningEmailJob>>;

  constructor(config: ConfigService) {
    this.queue = createQueue<SendSigningEmailJob>({
      name: QueueName.SIGNING_EMAIL,
      redisUrl: config.getOrThrow<string>('REDIS_URL'),
      connectionName: 'api-signing-email-producer',
      role: 'producer',
      connectTimeoutMs: ENQUEUE_TIMEOUT_MS,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: { age: 7 * 24 * 60 * 60 },
        removeOnFail: false,
      },
    });

    this.queue.on('error', (error) => {
      this.logger.error('Signing email queue connection error.', error.stack);
    });
  }

  async enqueue(payload: SendSigningEmailJob) {
    try {
      return await this.withTimeout(
        this.queue.add(QueueJobName.SEND_SIGNING_EMAIL, payload, {
          jobId: `signing-request-${payload.signingRequestId}`,
        }),
      );
    } catch (error) {
      this.logger.error(
        `Could not enqueue signing email job for signingRequestId=${payload.signingRequestId} documentId=${payload.documentId}.`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new SigningEmailQueueUnavailableError();
    }
  }

  onModuleDestroy() {
    return this.queue.close();
  }

  private async withTimeout<T>(operation: Promise<T>): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;

    try {
      return await Promise.race([
        operation,
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () =>
              reject(
                new Error(
                  `Signing email queue enqueue timed out after ${ENQUEUE_TIMEOUT_MS}ms.`,
                ),
              ),
            ENQUEUE_TIMEOUT_MS,
          );
        }),
      ]);
    } finally {
      if (timeout) {clearTimeout(timeout);}
    }
  }
}
