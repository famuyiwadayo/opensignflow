import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from './mail/mail.module';
import { SigningEmailProcessor } from './processors';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), MailModule],
  providers: [SigningEmailProcessor],
})
export class WorkerModule {}
