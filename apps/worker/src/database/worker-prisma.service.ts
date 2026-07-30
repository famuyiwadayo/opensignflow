import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { createPrismaClient } from '@opensignflow/database';

@Injectable()
export class WorkerPrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl)
      {throw new Error('DATABASE_URL is required to initialize worker database access.');}
    this.client = createPrismaClient({ databaseUrl, nodeEnv: process.env.NODE_ENV });
  }

  onModuleInit() {
    return this.client.$connect();
  }

  onModuleDestroy() {
    return this.client.$disconnect();
  }
}
