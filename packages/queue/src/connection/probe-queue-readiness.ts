import IORedis from 'ioredis';

export type QueueReadiness = { ready: boolean; target: string; reason?: string };

export async function probeQueueReadiness(input: {
  redisUrl: string;
  connectionName: string;
  timeoutMs?: number;
}): Promise<QueueReadiness> {
  const timeoutMs = input.timeoutMs ?? 5_000;
  const url = new URL(input.redisUrl);
  const target = `${url.hostname}:${url.port || '6379'}${url.pathname === '/' ? '/0' : url.pathname}`;
  const connection = new IORedis(input.redisUrl, {
    connectionName: input.connectionName,
    connectTimeout: timeoutMs,
    enableOfflineQueue: false,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  let timeout: NodeJS.Timeout | undefined;

  try {
    await Promise.race([
      connection.connect(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`Redis probe timed out after ${timeoutMs}ms.`)),
          timeoutMs,
        );
      }),
    ]);
    await connection.ping();
    return { ready: true, target };
  } catch (error) {
    return {
      ready: false,
      target,
      reason: error instanceof Error ? error.message : 'Unknown Redis readiness failure.',
    };
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
    connection.disconnect();
  }
}
