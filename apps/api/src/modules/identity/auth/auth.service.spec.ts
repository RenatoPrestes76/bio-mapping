import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../../../common/audit/audit-log.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock };
    session: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      findMany: jest.Mock;
    };
  };

  const baseUser = {
    id: 'user-1',
    email: 'jane@example.com',
    passwordHash: '',
    name: 'Jane Doe',
    birthDate: null,
    gender: null,
    role: 'PATIENT',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn() },
      session: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') },
        },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('creates a user and returns tokens when the email is not taken', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ ...baseUser, passwordHash: 'hashed' });
      prisma.session.create.mockResolvedValue({});

      const result = await service.register(
        { email: baseUser.email, password: 'S3nhaForte!23', name: baseUser.name },
        {},
      );

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.refreshToken).toHaveLength(128);
      expect(result.user.email).toBe(baseUser.email);
      expect(prisma.session.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: baseUser.id, rememberMe: false }) }),
      );
    });

    it('throws ConflictException when the email is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);

      await expect(
        service.register({ email: baseUser.email, password: 'S3nhaForte!23', name: baseUser.name }, {}),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns tokens for correct credentials', async () => {
      const passwordHash = await argon2.hash('S3nhaForte!23');
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash });
      prisma.session.create.mockResolvedValue({});

      const result = await service.login({ email: baseUser.email, password: 'S3nhaForte!23' }, {});

      expect(result.accessToken).toBe('signed.jwt.token');
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const passwordHash = await argon2.hash('correct-password');
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash });

      await expect(
        service.login({ email: baseUser.email, password: 'wrong-password' }, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@example.com', password: 'whatever' }, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('creates a 90-day session when rememberMe is true', async () => {
      const passwordHash = await argon2.hash('S3nhaForte!23');
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash });
      prisma.session.create.mockResolvedValue({});

      await service.login({ email: baseUser.email, password: 'S3nhaForte!23', rememberMe: true }, {});

      const createCall = prisma.session.create.mock.calls[0][0];
      expect(createCall.data.rememberMe).toBe(true);
      const days = (createCall.data.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      expect(days).toBeGreaterThan(89);
    });
  });

  describe('refresh', () => {
    it('rotates the refresh token when it is valid', async () => {
      const session = {
        id: 'session-1',
        userId: baseUser.id,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        rememberMe: false,
        user: baseUser,
      };
      prisma.session.findUnique.mockResolvedValue(session);
      prisma.session.update.mockResolvedValue({});
      prisma.session.create.mockResolvedValue({});

      const result = await service.refresh('some-refresh-token', {});

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: session.id },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result.accessToken).toBe('signed.jwt.token');
    });

    it('throws UnauthorizedException when the session does not exist', async () => {
      prisma.session.findUnique.mockResolvedValue(null);

      await expect(service.refresh('unknown-token', {})).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when the session was already revoked', async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        user: baseUser,
      });

      await expect(service.refresh('reused-token', {})).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when the session has expired', async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        user: baseUser,
      });

      await expect(service.refresh('expired-token', {})).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revokes only the session matching the given refresh token', async () => {
      prisma.session.findUnique.mockResolvedValue(null);
      prisma.session.updateMany.mockResolvedValue({ count: 1 });

      await service.logout('some-refresh-token');

      expect(prisma.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ revokedAt: null }),
          data: { revokedAt: expect.any(Date) },
        }),
      );
    });
  });

  describe('logoutAll', () => {
    it('revokes every active session for the user', async () => {
      prisma.session.updateMany.mockResolvedValue({ count: 3 });

      await service.logoutAll(baseUser.id);

      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: baseUser.id, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('listSessions', () => {
    it('maps active sessions to the response shape', async () => {
      const now = new Date();
      prisma.session.findMany.mockResolvedValue([
        {
          id: 'session-1',
          deviceName: 'iPhone 16',
          deviceType: 'MOBILE',
          ip: '10.0.0.1',
          lastSeenAt: now,
          createdAt: now,
          expiresAt: now,
        },
      ]);

      const result = await service.listSessions(baseUser.id);

      expect(result).toEqual([
        {
          id: 'session-1',
          deviceName: 'iPhone 16',
          deviceType: 'MOBILE',
          ip: '10.0.0.1',
          lastSeenAt: now,
          createdAt: now,
          expiresAt: now,
        },
      ]);
    });
  });

  describe('revokeSession', () => {
    it('revokes a session owned by the user', async () => {
      prisma.session.findUnique.mockResolvedValue({ id: 'session-1', userId: baseUser.id });
      prisma.session.update.mockResolvedValue({});

      await service.revokeSession(baseUser.id, 'session-1');

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('throws UnauthorizedException when the session belongs to another user', async () => {
      prisma.session.findUnique.mockResolvedValue({ id: 'session-1', userId: 'someone-else' });

      await expect(service.revokeSession(baseUser.id, 'session-1')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.session.update).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the session does not exist', async () => {
      prisma.session.findUnique.mockResolvedValue(null);

      await expect(service.revokeSession(baseUser.id, 'missing')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('hashToken', () => {
    it('produces a deterministic SHA-256 hex string', () => {
      const hash1 = service.hashToken('my-token');
      const hash2 = service.hashToken('my-token');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('produces different hashes for different tokens', () => {
      expect(service.hashToken('token-a')).not.toBe(service.hashToken('token-b'));
    });
  });
});
