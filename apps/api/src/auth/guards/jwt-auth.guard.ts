import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { apiError, AuthenticatedRequest, ErrorCode } from '@/common';
import { TokenService } from '../../auth/token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & Partial<AuthenticatedRequest>>();
    const authorization = request.header('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        apiError(ErrorCode.UNAUTHORIZED, 'Authentication is required.'),
      );
    }

    const token = authorization.slice('Bearer '.length).trim();
    const payload = this.tokenService.verifyAccessToken(token);

    request.user = {
      id: payload.sub,
      email: payload.email,
    };

    return true;
  }
}
