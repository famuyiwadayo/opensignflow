import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from './mail/';
import { OutboxModule } from './outbox';
import { SigningEmailProcessor } from './processors';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    MailModule,
    OutboxModule,
  ],
  providers: [SigningEmailProcessor],
})
export class WorkerModule {}
