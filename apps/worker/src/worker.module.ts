import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from './mail/';
import { OutboxModule } from './outbox';
import { SigningEmailProcessor } from './processors';
import { WorkerStorageModule } from './storage';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    MailModule,
    OutboxModule,
    WorkerStorageModule,
  ],
  providers: [SigningEmailProcessor],
})
export class WorkerModule {}
