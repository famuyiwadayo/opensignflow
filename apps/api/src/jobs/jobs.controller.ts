import {
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import IORedis from 'ioredis';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '@/auth';
import {
  ApiOkDataResponse,
  CurrentUser,
  type AuthenticatedUser,
} from '@/common';
import { JobEntity } from './entities';
import { JobsService } from './jobs.service';

@ApiTags('jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/jobs')
export class JobsController {
  constructor(@Inject(JobsService) private readonly jobs: JobsService) {}

  @Get('document/:documentId')
  @ApiOperation({
    summary: 'List document jobs and durable progress snapshots',
  })
  @ApiOkDataResponse(JobEntity, { isArray: true })
  async listForDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('documentId') documentId: string,
  ) {
    return {
      data: await this.jobs.listForDocument({
        user,
        organizationId,
        documentId,
      }),
    };
  }

  @Get(':jobId')
  @ApiOperation({ summary: 'Get durable job progress snapshot' })
  @ApiOkDataResponse(JobEntity)
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('jobId') jobId: string,
  ) {
    return { data: await this.jobs.get({ user, organizationId, jobId }) };
  }

  @Sse(':jobId/events')
  @ApiOperation({ summary: 'Stream live job progress events' })
  events(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('jobId') jobId: string,
  ) {
    return new Observable((subscriber) => {
      void this.jobs
        .get({ user, organizationId, jobId })
        .then(() => {
          const redis = new IORedis(required('REDIS_URL'), {
            connectionName: `api-job-progress-${jobId}`,
            maxRetriesPerRequest: 1,
          });
          const channel = `opensignflow:job-progress:${jobId}`;
          redis.on('message', (_channel, message) =>
            subscriber.next({
              type: 'job-progress',
              data: JSON.parse(message),
            }),
          );
          redis.subscribe(channel).catch((error) => subscriber.error(error));
          subscriber.add(() => void redis.quit());
        })
        .catch((error) => subscriber.error(error));
    });
  }
}
function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for job progress SSE.`);
  }
  return value;
}
