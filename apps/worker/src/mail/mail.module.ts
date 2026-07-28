import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MAIL_PROVIDER } from './providers/mail-provider.interface';
import { MailpitProvider } from './providers/mailpit.provider';
import { ResendProvider } from './providers/resend.provider';

@Module({
  providers: [
    MailService,
    MailpitProvider,
    ResendProvider,
    {
      provide: MAIL_PROVIDER,
      inject: [MailpitProvider, ResendProvider],
      useFactory: (mailpit: MailpitProvider, resend: ResendProvider) =>
        process.env.MAIL_PROVIDER === 'resend' ? resend : mailpit,
    },
  ],
  exports: [MailService],
})
export class MailModule {}
