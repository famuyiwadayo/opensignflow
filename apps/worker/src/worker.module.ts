import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from './mail/';
import { OutboxModule } from './outbox';
import { PdfFinalizationProcessor, SigningEmailProcessor } from './processors';
import { WorkerStorageModule } from './storage';
import { WorkerJobsModule } from './jobs';
import { WorkerDatabaseModule } from './database';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    MailModule,
    OutboxModule,
    WorkerDatabaseModule,
    WorkerStorageModule,
    WorkerJobsModule,
  ],
  providers: [SigningEmailProcessor, PdfFinalizationProcessor],
})
export class WorkerModule {}
