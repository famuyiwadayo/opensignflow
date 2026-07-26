import { Module } from '@nestjs/common';
import { AuditModule } from '@/audit';
import { DocumentsModule } from '@/documents';
import { SigningController } from './signing.controller';
import { SigningService } from './signing.service';

@Module({
  imports: [DocumentsModule, AuditModule],
  controllers: [SigningController],
  providers: [SigningService],
})
export class SigningModule {}
