import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
    logoutAll: jest.Mock;
    listSessions: jest.Mock;
    revokeSession: jest.Mock;
  };

  const req = { ip: '10.0.0.1', headers: { 'user-agent': 'jest-test' } } as any;
  const currentUser = { sub: 'user-1', email: 'jane@example.com', role: 'PATIENT' as const };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      logoutAll: jest.fn(),
      listSessions: jest.fn(),
      revokeSession: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get(AuthController);
  });

  it('register() forwards the dto and device context to the service', async () => {
    authService.register.mockResolvedValue({ accessToken: 'a', refreshToken: 'b' });

    await controller.register(
      { email: 'jane@example.com', password: 'x', name: 'Jane', deviceName: 'iPhone' } as any,
      req,
    );

    expect(authService.register).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jane@example.com' }),
      { deviceName: 'iPhone', deviceType: undefined, ip: '10.0.0.1', userAgent: 'jest-test' },
    );
  });

  it('login() forwards the dto and device context to the service', async () => {
    authService.login.mockResolvedValue({ accessToken: 'a', refreshToken: 'b' });

    await controller.login({ email: 'jane@example.com', password: 'x' } as any, req);

    expect(authService.login).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jane@example.com' }),
      { deviceName: undefined, deviceType: undefined, ip: '10.0.0.1', userAgent: 'jest-test' },
    );
  });

  it('refresh() forwards the refresh token, ip and user-agent to the service', async () => {
    authService.refresh.mockResolvedValue({ accessToken: 'a', refreshToken: 'b' });

    await controller.refresh({ refreshToken: 'token-1' }, req);

    expect(authService.refresh).toHaveBeenCalledWith('token-1', {
      ip: '10.0.0.1',
      userAgent: 'jest-test',
    });
  });

  it('logout() forwards the refresh token and device context to the service', async () => {
    await controller.logout({ refreshToken: 'token-1' }, req);

    expect(authService.logout).toHaveBeenCalledWith('token-1', {
      ip: '10.0.0.1',
      userAgent: 'jest-test',
    });
  });

  it('logoutAll() forwards the current user id and device context to the service', async () => {
    await controller.logoutAll(currentUser, req);

    expect(authService.logoutAll).toHaveBeenCalledWith('user-1', {
      ip: '10.0.0.1',
      userAgent: 'jest-test',
    });
  });

  it('listSessions() forwards the current user id to the service', async () => {
    authService.listSessions.mockResolvedValue([]);

    await controller.listSessions(currentUser);

    expect(authService.listSessions).toHaveBeenCalledWith('user-1');
  });

  it('revokeSession() forwards the current user id, session id and ip to the service', async () => {
    await controller.revokeSession(currentUser, 'session-1', req);

    expect(authService.revokeSession).toHaveBeenCalledWith('user-1', 'session-1', { ip: '10.0.0.1' });
  });
});
