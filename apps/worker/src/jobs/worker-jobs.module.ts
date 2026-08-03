import { Module } from '@nestjs/common';
import { WorkerDatabaseModule } from '@/database';
import { JobProgressService } from './job-progress.service';

@Module({
  imports: [WorkerDatabaseModule],
  providers: [JobProgressService],
  exports: [JobProgressService],
})
export class WorkerJobsModule {}
