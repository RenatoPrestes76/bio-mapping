import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { Gender, Role } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../../../common/audit/audit-log.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { toUserResponse, UserEntityLike } from '../users/dto/user-response.dto';
import {
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL_DAYS,
  REFRESH_TOKEN_TTL_REMEMBER_ME_DAYS,
} from './auth.constants';
import { JwtPayload } from './types/jwt-payload.interface';

export interface DeviceContext {
  deviceName?: string;
  deviceType?: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditLog: AuditLogService,
  ) {}

  async register(dto: RegisterDto, device: DeviceContext): Promise<AuthResponseDto> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        gender: dto.gender as Gender | undefined,
      },
    });

    await this.auditLog.log('AUTH_REGISTER', { userId: user.id, ip: device.ip, userAgent: device.userAgent });

    return this.issueSession(user, false, device);
  }

  async login(dto: LoginDto, device: DeviceContext): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      await this.auditLog.log('AUTH_LOGIN_FAILED', {
        ip: device.ip,
        userAgent: device.userAgent,
        metadata: { email: dto.email },
      });
      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.auditLog.log('AUTH_LOGIN', { userId: user.id, ip: device.ip, userAgent: device.userAgent });

    return this.issueSession(user, dto.rememberMe ?? false, device);
  }

  async refresh(refreshToken: string, device: DeviceContext): Promise<AuthResponseDto> {
    const tokenHash = this.hashToken(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    await this.auditLog.log('AUTH_REFRESH', {
      userId: session.userId,
      ip: device.ip,
      userAgent: device.userAgent,
    });

    return this.issueSession(session.user, session.rememberMe, device);
  }

  async logout(refreshToken: string, device?: DeviceContext): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: tokenHash } });

    await this.prisma.session.updateMany({
      where: { refreshTokenHash: tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (session) {
      await this.auditLog.log('AUTH_LOGOUT', {
        userId: session.userId,
        ip: device?.ip,
        userAgent: device?.userAgent,
      });
    }
  }

  async logoutAll(userId: string, device?: DeviceContext): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditLog.log('AUTH_LOGOUT_ALL', { userId, ip: device?.ip, userAgent: device?.userAgent });
  }

  async listSessions(userId: string): Promise<SessionResponseDto[]> {
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: 'desc' },
    });

    return sessions.map((session) => ({
      id: session.id,
      deviceName: session.deviceName,
      deviceType: session.deviceType,
      ip: session.ip,
      lastSeenAt: session.lastSeenAt,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    }));
  }

  async revokeSession(userId: string, sessionId: string, device?: DeviceContext): Promise<void> {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) {
      throw new UnauthorizedException('Sessão não encontrada');
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    await this.auditLog.log('AUTH_SESSION_REVOKED', {
      userId,
      ip: device?.ip,
      metadata: { sessionId },
    });
  }

  private async issueSession(
    user: UserEntityLike,
    rememberMe: boolean,
    device: DeviceContext,
  ): Promise<AuthResponseDto> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role as Role };
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: ACCESS_TOKEN_TTL });

    const refreshToken = randomBytes(64).toString('hex');
    const refreshTokenHash = this.hashToken(refreshToken);
    const days = rememberMe ? REFRESH_TOKEN_TTL_REMEMBER_ME_DAYS : REFRESH_TOKEN_TTL_DAYS;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        rememberMe,
        expiresAt,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        ip: device.ip,
      },
    });

    return {
      user: toUserResponse(user),
      accessToken,
      refreshToken,
    };
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
