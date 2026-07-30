import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { QueueReadinessService } from '../jobs';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    @Inject(QueueReadinessService)
    private readonly queueReadiness: QueueReadinessService,
  ) {}

  @Get('health')
  @Get('v1/health')
  @ApiOperation({
    summary: 'Check API health and background-job dependency readiness',
  })
  @ApiOkResponse({ description: 'API health status.' })
  check() {
    const redis = this.queueReadiness.getStatus();
    return {
      data: {
        status: redis.ready ? 'ok' : 'degraded',
        service: 'opensignflow-api',
        timestamp: new Date().toISOString(),
        dependencies: {
          redis: {
            status: redis.ready ? 'ready' : 'unavailable',
            target: redis.target,
          },
        },
        capabilities: {
          signingEmail: redis.ready ? 'available' : 'unavailable',
        },
      },
    };
  }
}
