import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsRepository } from './documents.repository';
import { DocumentsController } from './documents.controller';
import { OrganizationsModule } from '@/organizations';
import { StorageModule } from '@/storage';
import { PdfModule } from '@/pdf';
import { AuditModule } from '@/audit';

@Module({
  imports: [OrganizationsModule, StorageModule, PdfModule, AuditModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentsRepository],
  exports: [DocumentsService, DocumentsRepository],
})
export class DocumentsModule {}
