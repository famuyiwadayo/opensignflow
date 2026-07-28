import { Inject, Injectable } from '@nestjs/common';
import { MAIL_PROVIDER, type MailProvider, type SendMailInput } from './providers';

@Injectable()
export class MailService {
  constructor(@Inject(MAIL_PROVIDER) private readonly provider: MailProvider) {}

  send(input: SendMailInput) {
    return this.provider.send(input);
  }
}
