import type { ConnectionOptions } from 'bullmq';

export type QueueConnectionRole = 'producer' | 'consumer';

export type CreateQueueConnectionInput = {
  redisUrl: string;
  connectionName: string;
  role: QueueConnectionRole;
  connectTimeoutMs?: number;
};

/** Creates explicit BullMQ/ioredis options from a Redis URL without leaking Redis details into apps. */
export function createQueueConnection(input: CreateQueueConnectionInput): ConnectionOptions {
  const url = new URL(input.redisUrl);
  const database = url.pathname.length > 1 ? Number(url.pathname.slice(1)) : undefined;

  if (database !== undefined && (!Number.isInteger(database) || database < 0)) {
    throw new Error('REDIS_URL must contain a non-negative integer database number.');
  }

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: database,
    tls: url.protocol === 'rediss:' ? {} : undefined,
    connectionName: input.connectionName,
    connectTimeout: input.connectTimeoutMs ?? 5_000,
    enableOfflineQueue: input.role === 'producer' ? false : undefined,
    // BullMQ consumers require unlimited command retries; HTTP producers must fail promptly.
    maxRetriesPerRequest: input.role === 'consumer' ? null : 1,
  };
}
