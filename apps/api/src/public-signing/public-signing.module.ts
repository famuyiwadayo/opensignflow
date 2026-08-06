import { Module } from '@nestjs/common';
import { AuditModule } from '../audit';
import { PublicSigningController } from './public-signing.controller';
import { PublicSigningService } from './public-signing.service';
import { StorageModule } from '@/storage';

@Module({
  imports: [AuditModule, StorageModule],
  controllers: [PublicSigningController],
  providers: [PublicSigningService],
})
export class PublicSigningModule {}
