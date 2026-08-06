import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import type { MailProvider, SendMailInput } from './mail-provider.interface';

@Injectable()
export class ResendProvider implements MailProvider {
  async send(input: SendMailInput) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is required when MAIL_PROVIDER=resend.');
    }
    const response = await new Resend(apiKey).emails.send({
      from: process.env.SMTP_FROM ?? 'OpenSignFlow <no-reply@example.com>',
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (response.error) {
      throw new Error(`Resend delivery failed: ${response.error.message}`);
    }
  }
}
