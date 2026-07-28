import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { probeQueueReadiness, type QueueReadiness } from '@opensignflow/queue';

@Injectable()
export class QueueReadinessService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueReadinessService.name);
  private readiness: QueueReadiness = { ready: false, target: 'unverified', reason: 'Readiness probe has not completed.' };
  private timer?: NodeJS.Timeout;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    await this.refresh();
    this.timer = setInterval(() => void this.refresh(), 15_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  getStatus(): QueueReadiness {
    return this.readiness;
  }

  async refresh() {
    const next = await probeQueueReadiness({
      redisUrl: this.config.getOrThrow<string>('REDIS_URL'),
      connectionName: 'api-readiness-probe',
    });
    const changed = next.ready !== this.readiness.ready || next.target !== this.readiness.target;
    this.readiness = next;
    if (changed) {
      const message = `Redis queue dependency is ${next.ready ? 'ready' : 'degraded'} at ${next.target}.`;
      if (next.ready) this.logger.log(message);
      else this.logger.error(`${message} ${next.reason}`);
    }
  }
}
