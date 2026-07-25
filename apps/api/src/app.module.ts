import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { UsersModule } from './users';
import { HealthModule } from './health';
import { PrismaModule } from './database';
import { validateEnv } from './config/validate-env';
import { OrganizationsModule } from './organizations';
import { IdModule, RequestIdMiddleware } from './common';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit';
import { PdfModule } from './pdf';
import { StorageModule } from './storage';
import { DocumentsModule } from './documents/documents.module';
import { RecipientsModule } from './recipients';
import { DocumentFieldsModule } from './document-fields';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    IdModule,
    HealthModule,
    UsersModule,
    OrganizationsModule,
    AuthModule,
    AuditModule,
    PdfModule,
    StorageModule,
    DocumentsModule,
    DocumentFieldsModule,
    RecipientsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
