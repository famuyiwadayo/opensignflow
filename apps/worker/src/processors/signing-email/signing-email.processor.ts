import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createQueue, createWorker } from '@opensignflow/queue';
import {
  QueueName,
  type SendSigningEmailJob,
  type SigningEmailDeadLetterJob,
} from '@opensignflow/shared';
import { MailService, signingRequestTemplate } from '@/mail';

const DLQ_NAME = 'opensignflow-signing-email-dlq';

@Injectable()
export class SigningEmailProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SigningEmailProcessor.name);
  private worker?: ReturnType<typeof createWorker<SendSigningEmailJob>>;
  private deadLetterQueue?: ReturnType<typeof createQueue<SigningEmailDeadLetterJob>>;

  constructor(private readonly mailService: MailService) {}

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6380';
    this.logger.log(`${redisUrl}`);
    this.deadLetterQueue = createQueue<SigningEmailDeadLetterJob>({
      name: DLQ_NAME,
      redisUrl,
      connectionName: 'worker-signing-email-dlq-producer',
      role: 'producer',
    });
    this.worker = createWorker<SendSigningEmailJob>({
      name: QueueName.SIGNING_EMAIL,
      redisUrl,
      connectionName: 'worker-signing-email-consumer',
      role: 'consumer',
      processor: async (payload) => this.process(payload),
    });
    this.worker.on('error', (error) => {
      this.logger.error('Signing email worker connection or processing error.', error.stack);
    });
    await Promise.all([this.worker.waitUntilReady(), this.deadLetterQueue.waitUntilReady()]);
    this.worker.on('active', (job) => {
      this.logger.log(
        `Processing signing email job ${job.id} for signingRequestId=${job.data.signingRequestId}.`,
      );
    });
    this.worker.on('completed', (job) => {
      this.logger.log(
        `Completed signing email job ${job.id} for signingRequestId=${job.data.signingRequestId}.`,
      );
    });
    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Signing email job ${job?.id ?? 'unknown'} failed on attempt ${job?.attemptsMade ?? 'unknown'}.`,
        error.stack,
      );
      if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return;
      void this.deadLetterQueue
        ?.add('signing-email-delivery-failed', {
          originalJobId: job.id ?? 'unknown',
          signingRequestId: job.data.signingRequestId,
          documentId: job.data.documentId,
          recipientId: job.data.recipientId,
          failureReason: error.message,
          failedAt: new Date().toISOString(),
        })
        .catch((dlqError: unknown) =>
          this.logger.error('Could not publish signing email job to DLQ.', dlqError),
        );
    });
    this.logger.log(`Listening on ${QueueName.SIGNING_EMAIL}.`);
  }

  async onModuleDestroy() {
    await Promise.all([this.worker?.close(), this.deadLetterQueue?.close()]);
  }

  private async process(data: SendSigningEmailJob) {
    const signingUrl = `${(process.env.WEB_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')}/sign/${data.signingToken}`;
    const message = signingRequestTemplate({
      recipientName: data.recipientName,
      documentTitle: data.documentTitle,
      signingUrl,
    });
    await this.mailService.send({ to: data.recipientEmail, ...message });
  }
}
