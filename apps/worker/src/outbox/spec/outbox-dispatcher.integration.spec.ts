import { encryptPayload } from '@opensignflow/crypto';
import { OutboxEventStatus, OutboxEventType } from '@opensignflow/database';
import { createQueue } from '@opensignflow/queue';
import {
  QueueName,
  type OutboxPayloadEnvelope,
  type SendSigningEmailOutboxPayload,
} from '@opensignflow/shared';
import {
  clearTestDatabase,
  createTestDatabase,
  migrateTestDatabase,
  organizationFactory,
  outboxEventFactory,
  startTestServices,
  type TestServices,
  userFactory,
} from '@opensignflow/testkit';

import { WorkerPrismaService } from '../../database/worker-prisma.service';
import { SigningEmailOutboxHandler } from '../handlers/signing-email.outbox-handler';
import { OutboxDispatcherService } from '../outbox-dispatcher.service';
import { OutboxHandlerRegistry } from '../outbox-handler.registry';

jest.setTimeout(120_000);
const key = Buffer.alloc(32, 4).toString('base64');

describe('OutboxDispatcherService', () => {
  let services: TestServices;
  let database: ReturnType<typeof createTestDatabase>;

  beforeAll(async () => {
    services = await startTestServices();
    migrateTestDatabase(services.databaseUrl);
    database = createTestDatabase(services.databaseUrl);
    await database.$connect();
  });
  beforeEach(async () => {
    await clearTestDatabase(database);
  });
  afterAll(async () => {
    await database.$disconnect();
    await services.stop();
  });

  async function withWorker(action: (dispatcher: OutboxDispatcherService) => Promise<void>) {
    const previous = {
      DATABASE_URL: process.env.DATABASE_URL,
      REDIS_URL: process.env.REDIS_URL,
      OUTBOX_ENCRYPTION_KEY: process.env.OUTBOX_ENCRYPTION_KEY,
    };
    process.env.DATABASE_URL = services.databaseUrl;
    process.env.REDIS_URL = services.redisUrl;
    process.env.OUTBOX_ENCRYPTION_KEY = key;
    const workerDatabase = new WorkerPrismaService();
    await workerDatabase.onModuleInit();
    const handler = new SigningEmailOutboxHandler();
    try {
      const registry = new OutboxHandlerRegistry(handler);
      await action(new OutboxDispatcherService(workerDatabase, registry));
    } finally {
      await handler.onModuleDestroy();
      await workerDatabase.onModuleDestroy();
      if (previous.DATABASE_URL === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previous.DATABASE_URL;
      }
      if (previous.REDIS_URL === undefined) {
        delete process.env.REDIS_URL;
      } else {
        process.env.REDIS_URL = previous.REDIS_URL;
      }
      if (previous.OUTBOX_ENCRYPTION_KEY === undefined) {
        delete process.env.OUTBOX_ENCRYPTION_KEY;
      } else {
        process.env.OUTBOX_ENCRYPTION_KEY = previous.OUTBOX_ENCRYPTION_KEY;
      }
    }
  }

  it('claims a pending signing-email event and creates an idempotent BullMQ job', async () => {
    const user = userFactory();
    const organization = organizationFactory();
    await database.user.create({ data: user });
    await database.organization.create({ data: organization });

    const payload: OutboxPayloadEnvelope<'SEND_SIGNING_EMAIL', SendSigningEmailOutboxPayload> = {
      version: 1,
      type: 'SEND_SIGNING_EMAIL',
      payload: {
        signingRequestId: 'sreq_1',
        documentId: 'doc_1',
        recipientId: 'rcp_1',
        recipientEmail: 'signer@example.test',
        recipientName: 'Grace Hopper',
        documentTitle: 'Agreement',
        signingToken: 'test-token',
      },
    };
    const encrypted = encryptPayload({
      plaintext: JSON.stringify(payload),
      base64Key: key,
      keyVersion: 'test-v1',
    });
    const event = outboxEventFactory({
      organizationId: organization.id,
      type: OutboxEventType.SEND_SIGNING_EMAIL,
      encryptedPayload: JSON.stringify(encrypted),
      encryptionKeyVersion: encrypted.keyVersion,
    });
    await database.outboxEvent.create({ data: event });

    const previous = {
      DATABASE_URL: process.env.DATABASE_URL,
      REDIS_URL: process.env.REDIS_URL,
      OUTBOX_ENCRYPTION_KEY: process.env.OUTBOX_ENCRYPTION_KEY,
    };
    process.env.DATABASE_URL = services.databaseUrl;
    process.env.REDIS_URL = services.redisUrl;
    process.env.OUTBOX_ENCRYPTION_KEY = key;
    try {
      const workerDatabase = new WorkerPrismaService();
      await workerDatabase.onModuleInit();
      const handler = new SigningEmailOutboxHandler();
      const registry = new OutboxHandlerRegistry(handler);
      const dispatcher = new OutboxDispatcherService(workerDatabase, registry);
      await (dispatcher as unknown as { dispatch(eventId: string): Promise<void> }).dispatch(
        event.id,
      );

      const persisted = await database.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
      expect(persisted.status).toBe(OutboxEventStatus.DISPATCHED);
      const inspector = createQueue<SendSigningEmailOutboxPayload>({
        name: QueueName.SIGNING_EMAIL,
        redisUrl: services.redisUrl,
        connectionName: 'test-queue-inspector',
        role: 'producer',
      });
      const job = await inspector.getJob('signing-request-sreq_1');
      expect(job?.data.recipientEmail).toBe('signer@example.test');
      await inspector.close();
      await handler.onModuleDestroy();
      await workerDatabase.onModuleDestroy();
    } finally {
      process.env.DATABASE_URL = previous.DATABASE_URL;
      process.env.REDIS_URL = previous.REDIS_URL;
      process.env.OUTBOX_ENCRYPTION_KEY = previous.OUTBOX_ENCRYPTION_KEY;
    }
  });

  it('returns a malformed payload event to PENDING with a retry time', async () => {
    const user = userFactory();
    const organization = organizationFactory();
    await database.user.create({ data: user });
    await database.organization.create({ data: organization });
    const encrypted = encryptPayload({
      plaintext: JSON.stringify({ version: 1, type: 'SEND_SIGNING_EMAIL', payload: {} }),
      base64Key: key,
      keyVersion: 'test-v1',
    });
    const event = outboxEventFactory({
      organizationId: organization.id,
      encryptedPayload: JSON.stringify(encrypted),
      encryptionKeyVersion: encrypted.keyVersion,
    });
    await database.outboxEvent.create({ data: event });

    await withWorker(async (dispatcher) => {
      await (dispatcher as unknown as { dispatch(eventId: string): Promise<void> }).dispatch(
        event.id,
      );
    });

    const persisted = await database.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(persisted.status).toBe(OutboxEventStatus.PENDING);
    expect(persisted.attemptCount).toBe(1);
    expect(persisted.availableAt.getTime()).toBeGreaterThan(Date.now());
    expect(persisted.lastError).toContain('Invalid SEND_SIGNING_EMAIL outbox payload');
  });

  it('schedules retry when the selected handler fails to dispatch', async () => {
    const user = userFactory();
    const organization = organizationFactory();
    await database.user.create({ data: user });
    await database.organization.create({ data: organization });
    const encrypted = encryptPayload({
      plaintext: JSON.stringify({
        version: 1,
        type: 'SEND_SIGNING_EMAIL',
        payload: { signingRequestId: 'sreq_1' },
      }),
      base64Key: key,
      keyVersion: 'test-v1',
    });
    const event = outboxEventFactory({
      organizationId: organization.id,
      encryptedPayload: JSON.stringify(encrypted),
      encryptionKeyVersion: encrypted.keyVersion,
    });
    await database.outboxEvent.create({ data: event });

    const previous = {
      DATABASE_URL: process.env.DATABASE_URL,
      OUTBOX_ENCRYPTION_KEY: process.env.OUTBOX_ENCRYPTION_KEY,
    };
    process.env.DATABASE_URL = services.databaseUrl;
    process.env.OUTBOX_ENCRYPTION_KEY = key;
    const workerDatabase = new WorkerPrismaService();
    await workerDatabase.onModuleInit();
    try {
      const registry = {
        get: jest.fn().mockReturnValue({
          parse: jest.fn().mockReturnValue({}),
          dispatch: jest.fn().mockRejectedValue(new Error('Redis queue unavailable')),
        }),
      };
      const dispatcher = new OutboxDispatcherService(workerDatabase, registry as never);
      await (dispatcher as unknown as { dispatch(eventId: string): Promise<void> }).dispatch(
        event.id,
      );
    } finally {
      await workerDatabase.onModuleDestroy();
      if (previous.DATABASE_URL === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previous.DATABASE_URL;
      }
      if (previous.OUTBOX_ENCRYPTION_KEY === undefined) {
        delete process.env.OUTBOX_ENCRYPTION_KEY;
      } else {
        process.env.OUTBOX_ENCRYPTION_KEY = previous.OUTBOX_ENCRYPTION_KEY;
      }
    }

    const persisted = await database.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(persisted.status).toBe(OutboxEventStatus.PENDING);
    expect(persisted.attemptCount).toBe(1);
    expect(persisted.availableAt.getTime()).toBeGreaterThan(Date.now());
    expect(persisted.lastError).toContain('Redis queue unavailable');
  });

  it('allows only one concurrent dispatcher to claim and dispatch an event', async () => {
    const user = userFactory();
    const organization = organizationFactory();
    await database.user.create({ data: user });
    await database.organization.create({ data: organization });
    const encrypted = encryptPayload({
      plaintext: JSON.stringify({ version: 1, type: 'SEND_SIGNING_EMAIL', payload: {} }),
      base64Key: key,
      keyVersion: 'test-v1',
    });
    const event = outboxEventFactory({
      organizationId: organization.id,
      encryptedPayload: JSON.stringify(encrypted),
      encryptionKeyVersion: encrypted.keyVersion,
    });
    await database.outboxEvent.create({ data: event });

    const previous = {
      DATABASE_URL: process.env.DATABASE_URL,
      OUTBOX_ENCRYPTION_KEY: process.env.OUTBOX_ENCRYPTION_KEY,
    };
    process.env.DATABASE_URL = services.databaseUrl;
    process.env.OUTBOX_ENCRYPTION_KEY = key;
    const firstDatabase = new WorkerPrismaService();
    const secondDatabase = new WorkerPrismaService();
    await Promise.all([firstDatabase.onModuleInit(), secondDatabase.onModuleInit()]);
    const dispatch = jest.fn().mockResolvedValue(undefined);
    const registry = {
      get: jest.fn().mockReturnValue({ parse: jest.fn().mockReturnValue({}), dispatch }),
    };
    try {
      const first = new OutboxDispatcherService(firstDatabase, registry as never);
      const second = new OutboxDispatcherService(secondDatabase, registry as never);
      await Promise.all([
        (first as unknown as { dispatch(eventId: string): Promise<void> }).dispatch(event.id),
        (second as unknown as { dispatch(eventId: string): Promise<void> }).dispatch(event.id),
      ]);
    } finally {
      await Promise.all([firstDatabase.onModuleDestroy(), secondDatabase.onModuleDestroy()]);
      if (previous.DATABASE_URL === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previous.DATABASE_URL;
      }
      if (previous.OUTBOX_ENCRYPTION_KEY === undefined) {
        delete process.env.OUTBOX_ENCRYPTION_KEY;
      } else {
        process.env.OUTBOX_ENCRYPTION_KEY = previous.OUTBOX_ENCRYPTION_KEY;
      }
    }

    const persisted = await database.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(persisted.status).toBe(OutboxEventStatus.DISPATCHED);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('marks an event FAILED after its final dispatch attempt', async () => {
    const user = userFactory();
    const organization = organizationFactory();
    await database.user.create({ data: user });
    await database.organization.create({ data: organization });
    const encrypted = encryptPayload({
      plaintext: JSON.stringify({ version: 1, type: 'SEND_SIGNING_EMAIL', payload: {} }),
      base64Key: key,
      keyVersion: 'test-v1',
    });
    const event = outboxEventFactory({
      organizationId: organization.id,
      attemptCount: 9,
      encryptedPayload: JSON.stringify(encrypted),
      encryptionKeyVersion: encrypted.keyVersion,
    });
    await database.outboxEvent.create({ data: event });

    const previous = {
      DATABASE_URL: process.env.DATABASE_URL,
      OUTBOX_ENCRYPTION_KEY: process.env.OUTBOX_ENCRYPTION_KEY,
    };
    process.env.DATABASE_URL = services.databaseUrl;
    process.env.OUTBOX_ENCRYPTION_KEY = key;
    const workerDatabase = new WorkerPrismaService();
    await workerDatabase.onModuleInit();
    try {
      const registry = {
        get: jest.fn().mockReturnValue({
          parse: jest.fn().mockReturnValue({}),
          dispatch: jest.fn().mockRejectedValue(new Error('Redis queue unavailable')),
        }),
      };
      const dispatcher = new OutboxDispatcherService(workerDatabase, registry as never);
      await (dispatcher as unknown as { dispatch(eventId: string): Promise<void> }).dispatch(
        event.id,
      );
    } finally {
      await workerDatabase.onModuleDestroy();
      if (previous.DATABASE_URL === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previous.DATABASE_URL;
      }
      if (previous.OUTBOX_ENCRYPTION_KEY === undefined) {
        delete process.env.OUTBOX_ENCRYPTION_KEY;
      } else {
        process.env.OUTBOX_ENCRYPTION_KEY = previous.OUTBOX_ENCRYPTION_KEY;
      }
    }

    const persisted = await database.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(persisted.status).toBe(OutboxEventStatus.FAILED);
    expect(persisted.attemptCount).toBe(10);
    expect(persisted.lastError).toContain('Redis queue unavailable');
  });

  it('returns an expired processing lease to PENDING during recovery', async () => {
    const user = userFactory();
    const organization = organizationFactory();
    await database.user.create({ data: user });
    await database.organization.create({ data: organization });
    const event = outboxEventFactory({
      organizationId: organization.id,
      status: OutboxEventStatus.PROCESSING,
      lockedAt: new Date(Date.now() - 6 * 60 * 1000),
      lockedBy: 'crashed-worker',
    });
    await database.outboxEvent.create({ data: event });

    await withWorker(async (dispatcher) => {
      await (
        dispatcher as unknown as { recoverExpiredLeases(): Promise<void> }
      ).recoverExpiredLeases();
    });

    const persisted = await database.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(persisted.status).toBe(OutboxEventStatus.PENDING);
    expect(persisted.lockedAt).toBeNull();
    expect(persisted.lockedBy).toBeNull();
  });
});
