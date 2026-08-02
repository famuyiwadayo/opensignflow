import type { PrismaClient } from '@opensignflow/database';
import { createPrismaClient } from '@opensignflow/database';

export function createTestDatabase(databaseUrl: string): PrismaClient {
  return createPrismaClient({ databaseUrl, nodeEnv: 'test' });
}

/** Deletes all application data while retaining migrated schema and enums. */
export async function clearTestDatabase(database: ReturnType<typeof createTestDatabase>) {
  await database.$executeRawUnsafe('TRUNCATE TABLE users, organizations CASCADE');
}
