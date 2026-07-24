import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { UsersModule } from '@/users';
import { OrganizationsModule } from '@/organizations';
import { JwtAuthGuard } from './guards';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { RefreshSessionService } from './refresh-session.service';
import { TokenService } from './token.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    UsersModule,
    OrganizationsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    RefreshSessionService,
    JwtAuthGuard,
  ],
  exports: [TokenService, JwtAuthGuard],
})
export class AuthModule {}
