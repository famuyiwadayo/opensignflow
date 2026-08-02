import { Module } from '@nestjs/common';
import { WorkerDatabaseModule } from '../database/worker-database.module';
import { SigningEmailOutboxHandler } from './handlers/signing-email.outbox-handler';
import { OutboxDispatcherService } from './outbox-dispatcher.service';
import { OutboxHandlerRegistry } from './outbox-handler.registry';
import { PdfFinalizationOutboxHandler } from './handlers';

@Module({
  imports: [WorkerDatabaseModule],
  providers: [
    SigningEmailOutboxHandler,
    PdfFinalizationOutboxHandler,
    OutboxHandlerRegistry,
    OutboxDispatcherService,
  ],
})
export class OutboxModule {}
