import { Module } from '@nestjs/common';
import { WorkerPrismaService } from './worker-prisma.service';

@Module({ providers: [WorkerPrismaService], exports: [WorkerPrismaService] })
export class WorkerDatabaseModule {}
