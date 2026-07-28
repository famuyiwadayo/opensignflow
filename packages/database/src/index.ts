// Generated Prisma client remains an internal package implementation detail.
export * from './generated/client';
export * from './generated/enums';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from './generated/client';

export type CreatePrismaClientInput = { databaseUrl: string; nodeEnv?: string };

export function createPrismaClient(input: CreatePrismaClientInput) {
  return new PrismaClient(createPrismaClientOptions(input));
}

export function createPrismaClientOptions(
  input: CreatePrismaClientInput,
): Prisma.PrismaClientOptions {
  return {
    adapter: new PrismaPg({ connectionString: input.databaseUrl }),
    log: input.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
  };
}
