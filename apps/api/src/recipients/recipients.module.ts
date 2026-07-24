import { Module } from '@nestjs/common';

import { AuditModule } from '../audit';
import { DocumentsModule } from '../documents';
import { RecipientsController } from './recipients.controller';
import { RecipientsRepository } from './recipients.repository';
import { RecipientsService } from './recipients.service';

@Module({
  imports: [DocumentsModule, AuditModule],
  controllers: [RecipientsController],
  providers: [RecipientsRepository, RecipientsService],
  exports: [RecipientsRepository, RecipientsService],
})
export class RecipientsModule {}
