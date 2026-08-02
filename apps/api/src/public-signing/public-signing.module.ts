import { Module } from '@nestjs/common';
import { AuditModule } from '../audit';
import { PublicSigningController } from './public-signing.controller';
import { PublicSigningService } from './public-signing.service';

@Module({
  imports: [AuditModule],
  controllers: [PublicSigningController],
  providers: [PublicSigningService],
})
export class PublicSigningModule {}
