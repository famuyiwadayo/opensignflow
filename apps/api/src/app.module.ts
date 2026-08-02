import 'reflect-metadata';

import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { loadRepositoryEnvironment } from '@opensignflow/config';

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
import { SigningModule } from './signing';
import { JobsModule } from './jobs';
import { PublicSigningModule } from './public-signing';

// Module decorators evaluate while AppModule is imported, before main.ts can
// enter bootstrap(). Load root .env here so ConfigModule validation sees it.
loadRepositoryEnvironment();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Root .env is loaded explicitly during bootstrap by @opensignflow/config.
      // Do not let Nest load a second app-local env file.
      ignoreEnvFile: true,
      // Validate the authoritative runtime environment directly. ConfigModule's
      // file-derived `config` argument is intentionally empty in this setup.
      validate: validateEnv,
    }),
    PrismaModule,
    IdModule,
    HealthModule,
    UsersModule,
    OrganizationsModule,
    PublicSigningModule,
    AuthModule,
    AuditModule,
    PdfModule,
    StorageModule,
    DocumentsModule,
    DocumentFieldsModule,
    RecipientsModule,
    JobsModule,
    SigningModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
