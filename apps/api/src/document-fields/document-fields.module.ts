import { Module } from '@nestjs/common';
import { AuditModule } from '@/audit';
import { DocumentsModule } from '@/documents';
import { RecipientsModule } from '@/recipients';
import { DocumentFieldsController } from './document-fields.controller';
import { DocumentFieldsRepository } from './document-fields.repository';
import { DocumentFieldsService } from './document-fields.service';

@Module({
  imports: [DocumentsModule, RecipientsModule, AuditModule],
  controllers: [DocumentFieldsController],
  providers: [DocumentFieldsRepository, DocumentFieldsService],
})
export class DocumentFieldsModule {}
