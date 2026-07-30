import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { decryptPayload, type EncryptedPayload } from '@opensignflow/crypto';
import { OutboxEventStatus } from '@opensignflow/database';
import { Client } from 'pg';
import { WorkerPrismaService } from '../database/worker-prisma.service';
import { OutboxHandlerRegistry } from './outbox-handler.registry';

const SAFETY_SWEEP_MS = 60_000;
const LEASE_MS = 5 * 60_000;
const MAX_ATTEMPTS = 10;

@Injectable()
export class OutboxDispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxDispatcherService.name);
  private timer?: NodeJS.Timeout;
  private listener?: Client;
  private dispatching = false;

  private readonly workerId =
    process.env.WORKER_ID ?? process.env.HOSTNAME ?? `worker-${process.pid}`;

  constructor(
    private readonly prisma: WorkerPrismaService,
    private readonly handlers: OutboxHandlerRegistry,
  ) {}

  async onModuleInit() {
    await this.startListener();
    await this.dispatchSafely();
    this.timer = setInterval(() => void this.dispatchSafely(), SAFETY_SWEEP_MS);
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.listener?.end();
  }

  private async startListener() {
    this.listener = new Client({ connectionString: required('DATABASE_URL') });
    await this.listener.connect();
    await this.listener.query('LISTEN opensignflow_outbox');
    this.listener.on('notification', (message) => {
      if (message.channel === 'opensignflow_outbox')
        void this.dispatchSafely(message.payload || undefined);
    });
    this.listener.on('error', (error) =>
      this.logger.error('Outbox LISTEN connection failed.', error.stack),
    );
  }

  private async dispatchSafely(eventId?: string) {
    if (this.dispatching) return;
    this.dispatching = true;
    try {
      await this.recoverExpiredLeases();
      await this.dispatch(eventId);
    } finally {
      this.dispatching = false;
    }
  }

  private async recoverExpiredLeases() {
    const expiredBefore = new Date(Date.now() - LEASE_MS);
    await this.prisma.client.outboxEvent.updateMany({
      where: { status: OutboxEventStatus.PROCESSING, lockedAt: { lt: expiredBefore } },
      data: {
        status: OutboxEventStatus.PENDING,
        lockedAt: null,
        lockedBy: null,
        availableAt: new Date(),
      },
    });
  }

  private async dispatch(eventId?: string) {
    const events = await this.prisma.client.outboxEvent.findMany({
      where: { id: eventId, status: OutboxEventStatus.PENDING, availableAt: { lte: new Date() } },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    for (const event of events) {
      const claimed = await this.prisma.client.outboxEvent.updateMany({
        where: { id: event.id, status: OutboxEventStatus.PENDING },
        data: {
          status: OutboxEventStatus.PROCESSING,
          lockedAt: new Date(),
          lockedBy: this.workerId,
          attemptCount: { increment: 1 },
        },
      });
      if (!claimed.count) continue;

      try {
        const handler = this.handlers.get(event.type);
        if (!handler) throw new Error(`No outbox handler is registered for ${event.type}.`);

        const decryptedPayload = decryptPayload({
          ...(JSON.parse(event.encryptedPayload) as EncryptedPayload),
          base64Key: required('OUTBOX_ENCRYPTION_KEY'),
        });
        const payload = handler.parse(decryptedPayload);
        await handler.dispatch({ eventId: event.id, payload });

        await this.prisma.client.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: OutboxEventStatus.DISPATCHED,
            dispatchedAt: new Date(),
            lockedAt: null,
            lockedBy: null,
            lastError: null,
          },
        });
      } catch (error) {
        const attempts = event.attemptCount + 1;
        await this.prisma.client.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: attempts >= MAX_ATTEMPTS ? OutboxEventStatus.FAILED : OutboxEventStatus.PENDING,
            availableAt: new Date(Date.now() + attempts * 30_000),
            lockedAt: null,
            lockedBy: null,
            lastError: error instanceof Error ? error.message : 'Unknown outbox dispatch failure.',
          },
        });
        this.logger.error(
          `Outbox event ${event.id} dispatch failed.`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}
