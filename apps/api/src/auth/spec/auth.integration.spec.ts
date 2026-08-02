import {
  createTestDatabase,
  clearTestDatabase,
  migrateTestDatabase,
  startTestServices,
  type TestServices,
} from '@opensignflow/testkit';
import { PasswordService } from '../password.service';
import { RefreshSessionService } from '../refresh-session.service';
import { AuthService } from '../auth.service';
import { UsersRepository, UsersService } from '@/users';
import { OrganizationsRepository, OrganizationsService } from '@/organizations';
import { IdGeneratorService, ErrorCode } from '@/common';

jest.setTimeout(120_000);

describe('AuthService PostgreSQL integration', () => {
  let services: TestServices;
  let database: ReturnType<typeof createTestDatabase>;

  beforeAll(async () => {
    services = await startTestServices();
    migrateTestDatabase(services.databaseUrl);
    database = createTestDatabase(services.databaseUrl);
    await database.$connect();
  });
  beforeEach(async () => {
    await clearTestDatabase(database);
  });
  afterAll(async () => {
    await database.$disconnect();
    await services.stop();
  });

  function createAuth() {
    const ids = new IdGeneratorService();
    const usersRepository = new UsersRepository(database as never);
    const organizationsRepository = new OrganizationsRepository(
      database as never,
      ids,
    );
    const usersService = new UsersService(usersRepository, ids);
    const organizationsService = new OrganizationsService(
      organizationsRepository,
    );
    const config = {
      get: (name: string) =>
        name === 'REFRESH_TOKEN_TTL_DAYS' ? 30 : undefined,
    };
    const refreshSessions = new RefreshSessionService(
      database as never,
      ids,
      config as never,
    );
    const tokens = {
      signAccessToken: jest.fn().mockReturnValue('access-token'),
    };
    return new AuthService(
      database as never,
      usersRepository,
      usersService,
      organizationsRepository,
      organizationsService,
      new PasswordService(),
      tokens as never,
      refreshSessions,
      ids,
    );
  }

  it('registers workspace, membership, subscription, and hashed refresh session then rotates it', async () => {
    const auth = createAuth();

    const registered = await auth.register(
      {
        name: 'Grace Hopper',
        email: ' Grace@Example.test ',
        password: 'correct-horse-battery-staple',
      },
      { ipAddress: '127.0.0.1' },
    );
    const user = await database.user.findUniqueOrThrow({
      where: { id: registered.response.user.id },
    });
    const memberships = await database.organizationMember.findMany({
      where: { userId: user.id },
    });
    const subscriptions = await database.subscription.findMany();
    const sessions = await database.userSession.findMany({
      where: { userId: user.id },
    });

    expect(user.normalizedEmail).toBe('grace@example.test');
    expect(user.passwordHash).not.toBe('correct-horse-battery-staple');
    expect(memberships).toHaveLength(1);
    expect(memberships[0].role).toBe('OWNER');
    expect(subscriptions).toHaveLength(1);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].refreshTokenHash).not.toBe(registered.refreshToken);

    const refreshed = await auth.refresh(registered.refreshToken, {});
    const rotatedSessions = await database.userSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(refreshed.refreshToken).not.toBe(registered.refreshToken);
    expect(rotatedSessions).toHaveLength(2);
    expect(rotatedSessions[0].revokedAt).not.toBeNull();
  });

  it('enforces normalized-email uniqueness in the real registration workflow', async () => {
    const auth = createAuth();
    await auth.register(
      {
        name: 'Grace Hopper',
        email: 'grace@example.test',
        password: 'correct-horse-battery-staple',
      },
      {},
    );

    await expect(
      auth.register(
        {
          name: 'Another Grace',
          email: ' GRACE@EXAMPLE.TEST ',
          password: 'another-correct-password',
        },
        {},
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ErrorCode.EMAIL_ALREADY_REGISTERED,
      }),
    });

    expect(await database.user.count()).toBe(1);
  });

  it('authenticates valid credentials and revokes the active refresh session on logout', async () => {
    const auth = createAuth();
    const registered = await auth.register(
      {
        name: 'Ada Lovelace',
        email: 'ada@example.test',
        password: 'correct-horse-battery-staple',
      },
      {},
    );
    const loggedIn = await auth.login(
      { email: ' ADA@example.test ', password: 'correct-horse-battery-staple' },
      {},
    );

    expect(loggedIn.response.user.id).toBe(registered.response.user.id);
    expect(loggedIn.refreshToken).not.toBe(registered.refreshToken);

    await auth.logout(loggedIn.refreshToken);
    const sessions = await database.userSession.findMany({
      where: { userId: registered.response.user.id },
    });
    expect(sessions.some((session) => session.revokedAt !== null)).toBe(true);
  });

  it('returns one public invalid-credentials error for unknown users and wrong passwords', async () => {
    const auth = createAuth();
    const registered = await auth.register(
      {
        name: 'Ada Lovelace',
        email: 'ada@example.test',
        password: 'correct-horse-battery-staple',
      },
      {},
    );

    await expect(
      auth.login(
        { email: 'missing@example.test', password: 'incorrect-password' },
        {},
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ErrorCode.INVALID_CREDENTIALS,
      }),
    });
    await expect(
      auth.login(
        {
          email: registered.response.user.email,
          password: 'incorrect-password',
        },
        {},
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ErrorCode.INVALID_CREDENTIALS,
      }),
    });
  });
});
