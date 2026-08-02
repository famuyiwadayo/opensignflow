import { AuthController } from '../auth.controller';

describe('AuthController refresh cookie contract', () => {
  const authService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    me: jest.fn(),
  };
  const controller = new AuthController(authService as never);
  const response = { cookie: jest.fn(), clearCookie: jest.fn() };
  const request = {
    ip: '127.0.0.1',
    header: jest.fn().mockReturnValue('test-agent'),
    cookies: {},
  };

  beforeEach(() => jest.clearAllMocks());

  it('sets a scoped HttpOnly refresh cookie after login', async () => {
    const expiresAt = new Date('2026-08-01T00:00:00.000Z');
    authService.login.mockResolvedValue({
      response: { accessToken: 'access-token' },
      refreshToken: 'refresh-token',
      refreshTokenExpiresAt: expiresAt,
    });

    await controller.login(
      { email: 'owner@example.com', password: 'password' },
      request as never,
      response as never,
    );

    expect(response.cookie).toHaveBeenCalledWith(
      'opensignflow_refresh_token',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/v1/auth',
        expires: expiresAt,
      }),
    );
  });

  it('sets the refresh cookie after registration with the returned session expiry', async () => {
    const expiresAt = new Date('2026-08-01T00:00:00.000Z');
    authService.register.mockResolvedValue({
      response: { accessToken: 'access-token' },
      refreshToken: 'refresh-token',
      refreshTokenExpiresAt: expiresAt,
    });

    await controller.register(
      {
        name: 'Grace Hopper',
        email: 'grace@example.com',
        password: 'correct-password',
      },
      request as never,
      response as never,
    );

    expect(authService.register).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'grace@example.com' }),
      expect.objectContaining({
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      }),
    );
    expect(response.cookie).toHaveBeenCalledWith(
      'opensignflow_refresh_token',
      'refresh-token',
      expect.objectContaining({ expires: expiresAt }),
    );
  });

  it('rotates the refresh cookie using the request cookie value', async () => {
    const expiresAt = new Date('2026-08-02T00:00:00.000Z');
    const refreshRequest = {
      ...request,
      cookies: { opensignflow_refresh_token: 'old-token' },
    };
    authService.refresh.mockResolvedValue({
      response: { accessToken: 'new-access-token' },
      refreshToken: 'new-refresh-token',
      refreshTokenExpiresAt: expiresAt,
    });

    await controller.refresh(refreshRequest as never, response as never);

    expect(authService.refresh).toHaveBeenCalledWith(
      'old-token',
      expect.objectContaining({ ipAddress: '127.0.0.1' }),
    );
    expect(response.cookie).toHaveBeenCalledWith(
      'opensignflow_refresh_token',
      'new-refresh-token',
      expect.objectContaining({ expires: expiresAt }),
    );
  });

  it('returns current-user data through the standard data envelope', async () => {
    authService.me.mockResolvedValue({
      user: { id: 'usr_1' },
      organizations: [],
    });

    await expect(
      controller.me({ id: 'usr_1', email: 'owner@example.com' }),
    ).resolves.toEqual({
      data: { user: { id: 'usr_1' }, organizations: [] },
    });
  });

  it('clears the scoped refresh cookie on logout even when no token exists', async () => {
    await controller.logout(request as never, response as never);

    expect(authService.logout).toHaveBeenCalledWith(undefined);
    expect(response.clearCookie).toHaveBeenCalledWith(
      'opensignflow_refresh_token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/v1/auth',
      }),
    );
  });

  it('marks refresh cookies secure in production', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    authService.login.mockResolvedValue({
      response: {},
      refreshToken: 'refresh-token',
      refreshTokenExpiresAt: new Date(),
    });
    try {
      await controller.login(
        { email: 'owner@example.com', password: 'password' },
        request as never,
        response as never,
      );
      expect(response.cookie).toHaveBeenCalledWith(
        'opensignflow_refresh_token',
        'refresh-token',
        expect.objectContaining({ secure: true }),
      );
    } finally {
      if (previous === undefined) {delete process.env.NODE_ENV;}
      else {process.env.NODE_ENV = previous;}
    }
  });
});
