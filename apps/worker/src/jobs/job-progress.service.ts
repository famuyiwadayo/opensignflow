import type { OnModuleDestroy } from '@nestjs/common';
import { Inject, Injectable } from '@nestjs/common';
import IORedis from 'ioredis';
import { ProcessingStatus } from '@opensignflow/database';
import type { JobProgressEvent } from '@opensignflow/shared';
import { WorkerPrismaService } from '../database/worker-prisma.service';

@Injectable()
export class JobProgressService implements OnModuleDestroy {
  private readonly publisher = new IORedis(required('REDIS_URL'), {
    connectionName: 'worker-job-progress-publisher',
    maxRetriesPerRequest: 1,
  });
  constructor(@Inject(WorkerPrismaService) private readonly prisma: WorkerPrismaService) {}

  async report(event: JobProgressEvent) {
    const percent = Math.max(0, Math.min(100, Math.round(event.percent)));
    const status = ProcessingStatus[event.status];
    await this.prisma.client.jobRecord.update({
      where: { id: event.jobId },
      data: {
        status,
        progressPercent: percent,
        progressPhase: event.phase.slice(0, 80),
        progressMessage: event.message?.slice(0, 500),
        completedAt: event.status === 'COMPLETED' ? new Date() : undefined,
      },
    });
    await this.publisher.publish(
      `opensignflow:job-progress:${event.jobId}`,
      JSON.stringify({ ...event, percent }),
    );
  }

  onModuleDestroy() {
    return this.publisher.quit();
  }
}

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for job progress.`);
  }
  return value;
}
