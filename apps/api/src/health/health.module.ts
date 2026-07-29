import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { JobsModule } from '@/jobs';

@Module({
  imports: [JobsModule],
  controllers: [HealthController],
})
export class HealthModule {}
