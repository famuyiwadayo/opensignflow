import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class HealthController {
  @Get('health')
  @Get('v1/health')
  @ApiOperation({ summary: 'Check API health' })
  @ApiOkResponse({
    description: 'API is healthy.',
    schema: {
      example: {
        data: {
          status: 'ok',
          service: 'opensignflow-api',
          timestamp: '2026-07-23T12:00:00.000Z',
        },
      },
    },
  })
  check() {
    return {
      data: {
        status: 'ok',
        service: 'opensignflow-api',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
