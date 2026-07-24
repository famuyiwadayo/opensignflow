import { createHash, randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';

import { userPublicSelect } from '@/users';
import { PrismaService } from '@/database';
import { apiError, ErrorCode, IdGeneratorService } from '@/common';

export type RequestContext = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class RefreshSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idGenerator: IdGeneratorService,
    private readonly configService: ConfigService,
  ) {}

  async create(userId: string, context: RequestContext) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = this.refreshTokenExpiresAt();

    await this.prisma.userSession.create({
      data: {
        id: this.idGenerator.generate('ses'),
        userId,
        refreshTokenHash: this.hashToken(token),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        expiresAt,
      },
    });

    return { token, expiresAt };
  }

  async rotate(token: string, context: RequestContext) {
    const tokenHash = this.hashToken(token);
    const now = new Date();

    const session = await this.prisma.userSession.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: {
        user: {
          select: userPublicSelect,
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt <= now) {
      throw new UnauthorizedException(
        apiError(
          ErrorCode.REFRESH_TOKEN_INVALID,
          'Refresh session is invalid or expired.',
        ),
      );
    }

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: {
        revokedAt: now,
        lastUsedAt: now,
      },
    });

    const replacement = await this.create(session.userId, context);

    return {
      user: session.user,
      refreshToken: replacement.token,
      refreshTokenExpiresAt: replacement.expiresAt,
    };
  }

  async revoke(token: string | undefined) {
    if (!token) {
      return;
    }

    await this.prisma.userSession.updateMany({
      where: {
        refreshTokenHash: this.hashToken(token),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshTokenExpiresAt(): Date {
    const ttlDays = Number(
      this.configService.get('REFRESH_TOKEN_TTL_DAYS') ?? 30,
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);
    return expiresAt;
  }
}
