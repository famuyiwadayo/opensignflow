import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { MailProvider, SendMailInput } from './mail-provider.interface';

@Injectable()
export class MailpitProvider implements MailProvider {
  private readonly logger = new Logger(MailpitProvider.name);
  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
  });

  async send(input: SendMailInput) {
    const result = await this.transporter.sendMail({
      from: process.env.SMTP_FROM ?? 'OpenSignFlow <no-reply@localhost>',
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    this.logger.log(`Mailpit accepted signing email messageId=${result.messageId}.`);
  }
}
