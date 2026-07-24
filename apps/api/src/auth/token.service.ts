import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { apiError, ErrorCode } from '@/common';
import { AccessTokenPayload } from './entities';

type AccessTokenInput = {
  sub: string;
  email: string;
};

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  signAccessToken(input: AccessTokenInput): string {
    const payload: AccessTokenPayload = {
      sub: input.sub,
      email: input.email,
      type: 'access',
    };

    return this.jwtService.sign(payload, {
      secret: this.accessTokenSecret(),
      expiresIn: this.accessTokenTtlSeconds(),
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const payload = this.jwtService.verify<AccessTokenPayload>(token, {
        secret: this.accessTokenSecret(),
      });

      if (payload.type !== 'access') {
        throw this.invalidAccessToken();
      }

      return payload;
    } catch {
      throw this.invalidAccessToken();
    }
  }

  private accessTokenSecret(): string {
    return String(this.configService.get('JWT_ACCESS_SECRET'));
  }

  private accessTokenTtlSeconds(): number {
    return Number(this.configService.get('ACCESS_TOKEN_TTL_SECONDS') ?? 900);
  }

  private invalidAccessToken() {
    return new UnauthorizedException(
      apiError(
        ErrorCode.ACCESS_TOKEN_INVALID,
        'Invalid or expired access token.',
      ),
    );
  }
}
