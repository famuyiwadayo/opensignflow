import { createHash } from 'node:crypto';

import { ErrorCode } from '@/common';
import { RefreshSessionService } from '../refresh-session.service';

const now = new Date();

describe('RefreshSessionService', () => {
  const prisma = {
    userSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const idGenerator = { generate: jest.fn().mockReturnValue('ses_1') };
  const config = { get: jest.fn().mockReturnValue(30) };
  const service = new RefreshSessionService(
    prisma as never,
    idGenerator as never,
    config as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('stores only a SHA-256 hash when creating an opaque refresh session', async () => {
    prisma.userSession.create.mockResolvedValue({});

    const result = await service.create('usr_1', {
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });

    expect(result.token).toBeTruthy();
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(prisma.userSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: 'ses_1',
          userId: 'usr_1',
          refreshTokenHash: createHash('sha256')
            .update(result.token)
            .digest('hex'),
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      }),
    );
  });

  it('rejects unknown, revoked, and expired refresh sessions with one public error', async () => {
    prisma.userSession.findUnique.mockResolvedValue(null);
    await expect(service.rotate('unknown-token', {})).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ErrorCode.REFRESH_TOKEN_INVALID,
      }),
    });

    prisma.userSession.findUnique.mockResolvedValue({
      id: 'ses_1',
      userId: 'usr_1',
      revokedAt: now,
      expiresAt: new Date(Date.now() + 60_000),
      user: {},
    });
    await expect(service.rotate('revoked-token', {})).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ErrorCode.REFRESH_TOKEN_INVALID,
      }),
    });

    prisma.userSession.findUnique.mockResolvedValue({
      id: 'ses_1',
      userId: 'usr_1',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 60_000),
      user: {},
    });
    await expect(service.rotate('expired-token', {})).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ErrorCode.REFRESH_TOKEN_INVALID,
      }),
    });

    expect(prisma.userSession.update).not.toHaveBeenCalled();
  });

  it('revokes the old session and creates a replacement when rotating a valid token', async () => {
    const session = {
      id: 'ses_old',
      userId: 'usr_1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: 'usr_1',
        email: 'owner@example.com',
        name: 'Owner',
        createdAt: now,
        updatedAt: now,
      },
    };
    prisma.userSession.findUnique.mockResolvedValue(session);
    prisma.userSession.create.mockResolvedValue({});

    const result = await service.rotate('valid-token', {
      ipAddress: '127.0.0.1',
    });

    expect(prisma.userSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ses_old' } }),
    );
    expect(prisma.userSession.create).toHaveBeenCalledTimes(1);
    expect(result.user).toBe(session.user);
    expect(result.refreshToken).toBeTruthy();
    expect(result.refreshToken).not.toBe('valid-token');
  });

  it('revokes matching active sessions and treats missing token as a no-op', async () => {
    await service.revoke(undefined);
    expect(prisma.userSession.updateMany).not.toHaveBeenCalled();

    await service.revoke('refresh-token');
    expect(prisma.userSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          refreshTokenHash: createHash('sha256')
            .update('refresh-token')
            .digest('hex'),
          revokedAt: null,
        }),
      }),
    );
  });
});
