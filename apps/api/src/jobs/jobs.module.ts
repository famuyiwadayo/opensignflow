import { Module } from '@nestjs/common';
import { SigningEmailQueue } from './signing-email';
import { QueueReadinessService } from './queue-readiness.service';
import { OrganizationsModule } from '@/organizations';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

/** Owns API-side job producers; processors belong exclusively to apps/worker. */
@Module({
  imports: [OrganizationsModule],
  controllers: [JobsController],
  providers: [SigningEmailQueue, QueueReadinessService, JobsService],
  exports: [SigningEmailQueue, QueueReadinessService, JobsService],
})
export class JobsModule {}
