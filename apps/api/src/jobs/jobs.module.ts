import { Module } from '@nestjs/common';
import { SigningEmailQueue } from './signing-email';
import { QueueReadinessService } from './queue-readiness.service';

/** Owns API-side job producers; processors belong exclusively to apps/worker. */
@Module({
  providers: [SigningEmailQueue, QueueReadinessService],
  exports: [SigningEmailQueue, QueueReadinessService],
})
export class JobsModule {}
