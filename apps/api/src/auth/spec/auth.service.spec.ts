import { ErrorCode } from '@/common';
import { AuthService } from '../auth.service';

describe('AuthService', () => {
  const prisma = { $transaction: jest.fn() };
  const usersRepository = {
    existsByNormalizedEmail: jest.fn(),
    findByNormalizedEmailForAuth: jest.fn(),
    create: jest.fn(),
  };
  const usersService = {
    normalizeEmail: jest.fn((email: string) => email.trim().toLowerCase()),
  };
  const organizationsRepository = {
    createPersonalOrganizationForUser: jest.fn(),
  };
  const organizationsService = {
    createPersonalWorkspaceName: jest.fn(),
    listMembershipsForUser: jest.fn(),
  };
  const passwordService = { hash: jest.fn(), compare: jest.fn() };
  const tokenService = { signAccessToken: jest.fn() };
  const refreshSessionService = {
    create: jest.fn(),
    rotate: jest.fn(),
    revoke: jest.fn(),
  };
  const idGenerator = { generate: jest.fn() };
  const service = new AuthService(
    prisma as never,
    usersRepository as never,
    usersService as never,
    organizationsRepository as never,
    organizationsService as never,
    passwordService as never,
    tokenService as never,
    refreshSessionService as never,
    idGenerator as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('rejects registration when normalized email already exists', async () => {
    usersRepository.existsByNormalizedEmail.mockResolvedValue(true);

    await expect(
      service.register(
        {
          name: 'Grace Hopper',
          email: ' GRACE@example.com ',
          password: 'correct-horse-battery-staple',
        },
        {},
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ErrorCode.EMAIL_ALREADY_REGISTERED,
      }),
    });

    expect(usersService.normalizeEmail).toHaveBeenCalledWith(
      ' GRACE@example.com ',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns one standardized invalid-credentials error for unknown email', async () => {
    usersRepository.findByNormalizedEmailForAuth.mockResolvedValue(null);

    await expect(
      service.login(
        { email: 'missing@example.com', password: 'incorrect-password' },
        {},
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ErrorCode.INVALID_CREDENTIALS,
      }),
    });

    expect(passwordService.compare).not.toHaveBeenCalled();
    expect(refreshSessionService.create).not.toHaveBeenCalled();
  });

  it('returns one standardized invalid-credentials error for wrong password', async () => {
    usersRepository.findByNormalizedEmailForAuth.mockResolvedValue({
      id: 'usr_1',
      passwordHash: 'hash',
    });
    passwordService.compare.mockResolvedValue(false);

    await expect(
      service.login(
        { email: 'owner@example.com', password: 'incorrect-password' },
        {},
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ErrorCode.INVALID_CREDENTIALS,
      }),
    });

    expect(refreshSessionService.create).not.toHaveBeenCalled();
  });

  it('rejects refresh without a refresh token before rotating a session', async () => {
    await expect(service.refresh(undefined, {})).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ErrorCode.REFRESH_TOKEN_REQUIRED,
      }),
    });

    expect(refreshSessionService.rotate).not.toHaveBeenCalled();
  });

  it('delegates logout to refresh-session revocation and remains safe without a token', async () => {
    await service.logout(undefined);
    expect(refreshSessionService.revoke).toHaveBeenCalledWith(undefined);
  });

  it('registers a user, personal workspace, session, and access token in one workflow', async () => {
    const createdAt = new Date('2026-07-30T00:00:00.000Z');
    const user = {
      id: 'usr_1',
      email: 'grace@example.com',
      name: 'Grace Hopper',
      createdAt,
      updatedAt: createdAt,
    };
    const membership = {
      id: 'mem_1',
      role: 'OWNER',
      createdAt,
      updatedAt: createdAt,
      organization: {
        id: 'org_1',
        name: 'Grace Hopper’s Workspace',
        slug: null,
        createdAt,
        updatedAt: createdAt,
      },
    };
    usersRepository.existsByNormalizedEmail.mockResolvedValue(false);
    passwordService.hash.mockResolvedValue('password-hash');
    usersRepository.create = jest.fn().mockResolvedValue(user);
    organizationsRepository.createPersonalOrganizationForUser.mockResolvedValue(
      membership,
    );
    organizationsService.createPersonalWorkspaceName.mockReturnValue(
      'Grace Hopper’s Workspace',
    );
    prisma.$transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) => callback({}),
    );
    idGenerator.generate.mockReturnValueOnce('usr_1');
    refreshSessionService.create.mockResolvedValue({
      token: 'refresh-token',
      expiresAt: new Date('2026-08-01T00:00:00.000Z'),
    });
    tokenService.signAccessToken.mockReturnValue('access-token');

    const result = await service.register(
      {
        name: 'Grace Hopper',
        email: ' Grace@Example.com ',
        password: 'correct-horse-battery-staple',
      },
      {},
    );

    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        normalizedEmail: 'grace@example.com',
        passwordHash: 'password-hash',
      }),
      expect.anything(),
    );
    expect(
      organizationsRepository.createPersonalOrganizationForUser,
    ).toHaveBeenCalled();
    expect(refreshSessionService.create).toHaveBeenCalledWith('usr_1', {});
    expect(result.response.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.response.organizations).toHaveLength(1);
  });

  it('logs in valid credentials with memberships, session, and access token', async () => {
    const createdAt = new Date('2026-07-30T00:00:00.000Z');
    const user = {
      id: 'usr_1',
      email: 'owner@example.com',
      name: 'Owner',
      passwordHash: 'hash',
      createdAt,
      updatedAt: createdAt,
    };
    const memberships = [
      {
        id: 'mem_1',
        role: 'OWNER',
        createdAt,
        updatedAt: createdAt,
        organization: {
          id: 'org_1',
          name: 'Workspace',
          slug: null,
          createdAt,
          updatedAt: createdAt,
        },
      },
    ];
    usersRepository.findByNormalizedEmailForAuth.mockResolvedValue(user);
    passwordService.compare.mockResolvedValue(true);
    organizationsService.listMembershipsForUser.mockResolvedValue(memberships);
    refreshSessionService.create.mockResolvedValue({
      token: 'refresh-token',
      expiresAt: createdAt,
    });
    tokenService.signAccessToken.mockReturnValue('access-token');

    const result = await service.login(
      { email: user.email, password: 'correct-password' },
      {},
    );

    expect(passwordService.compare).toHaveBeenCalledWith(
      'correct-password',
      'hash',
    );
    expect(refreshSessionService.create).toHaveBeenCalledWith(user.id, {});
    expect(result.response.accessToken).toBe('access-token');
    expect(result.response.organizations).toHaveLength(1);
  });

  it('rotates a valid refresh token and returns memberships with a new access token', async () => {
    const createdAt = new Date('2026-07-30T00:00:00.000Z');
    const user = {
      id: 'usr_1',
      email: 'owner@example.com',
      name: 'Owner',
      createdAt,
      updatedAt: createdAt,
    };
    const memberships = [
      {
        id: 'mem_1',
        role: 'OWNER',
        createdAt,
        updatedAt: createdAt,
        organization: {
          id: 'org_1',
          name: 'Workspace',
          slug: null,
          createdAt,
          updatedAt: createdAt,
        },
      },
    ];
    refreshSessionService.rotate.mockResolvedValue({
      user,
      refreshToken: 'replacement-token',
      refreshTokenExpiresAt: createdAt,
    });
    organizationsService.listMembershipsForUser.mockResolvedValue(memberships);
    tokenService.signAccessToken.mockReturnValue('replacement-access-token');

    const result = await service.refresh('old-token', {});

    expect(refreshSessionService.rotate).toHaveBeenCalledWith('old-token', {});
    expect(result.refreshToken).toBe('replacement-token');
    expect(result.response.accessToken).toBe('replacement-access-token');
  });
});
