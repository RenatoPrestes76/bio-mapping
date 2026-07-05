import { Injectable, NotFoundException } from '@nestjs/common';
import { DeviceSessionStatus, DeviceStatus } from '@bio/database';
import { PrismaService } from '../../../../database/prisma.service';
import { AuditLogService, AuditContext } from '../../../../common/audit/audit-log.service';
import { BleManagerService } from '../../ble/ble-manager.service';
import { toSessionResponse } from '../dto/session-response.dto';
import { paginated } from '../../../../common/dto/pagination.dto';

interface Actor { sub: string; role: string }

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly ble: BleManagerService,
  ) {}

  async startSession(deviceId: string, actor: Actor, context: AuditContext) {
    const device = await this.findDeviceOrFail(deviceId);

    const session = await this.prisma.deviceSession.create({
      data: { deviceId, status: DeviceSessionStatus.ACTIVE },
    });

    // Update device status + connection counter
    await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        status: DeviceStatus.CONNECTED,
        lastSeen: new Date(),
        totalConnections: { increment: 1 },
      },
    });

    this.ble.connect(deviceId, session.id);

    await this.audit.log('SESSION_STARTED', {
      ...context,
      userId: actor.sub,
      metadata: { deviceId, sessionId: session.id },
    });

    return toSessionResponse(session);
  }

  async endSession(sessionId: string, actor: Actor, context: AuditContext, opts?: { error?: string; signalQuality?: number; latencyMs?: number; bytesReceived?: bigint; bytesSent?: bigint }) {
    const session = await this.prisma.deviceSession.findFirst({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');

    const endedAt = new Date();
    const updated = await this.prisma.deviceSession.update({
      where: { id: sessionId },
      data: {
        endedAt,
        status: opts?.error ? DeviceSessionStatus.ERROR : DeviceSessionStatus.ENDED,
        error: opts?.error ?? null,
        signalQuality: opts?.signalQuality ?? null,
        latencyMs: opts?.latencyMs ?? null,
        bytesReceived: opts?.bytesReceived ?? session.bytesReceived,
        bytesSent: opts?.bytesSent ?? session.bytesSent,
      },
    });

    await this.prisma.device.update({
      where: { id: session.deviceId },
      data: {
        status: DeviceStatus.DISCONNECTED,
        lastSeen: endedAt,
        ...(opts?.error && { totalErrors: { increment: 1 } }),
      },
    });

    this.ble.disconnect(session.deviceId, sessionId, opts?.error);

    await this.audit.log('SESSION_ENDED', {
      ...context,
      userId: actor.sub,
      metadata: { sessionId, deviceId: session.deviceId, error: opts?.error },
    });

    return toSessionResponse(updated);
  }

  async findSessions(page = 1, limit = 20, deviceId?: string) {
    const where: any = {};
    if (deviceId) where.deviceId = deviceId;

    const [sessions, total] = await this.prisma.$transaction([
      this.prisma.deviceSession.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.deviceSession.count({ where }),
    ]);

    return paginated(sessions.map(toSessionResponse), total, page, limit);
  }

  async findById(sessionId: string) {
    const session = await this.prisma.deviceSession.findFirst({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Sessão não encontrada');
    return toSessionResponse(session);
  }

  private async findDeviceOrFail(deviceId: string) {
    const device = await this.prisma.device.findFirst({ where: { id: deviceId, deletedAt: null } });
    if (!device) throw new NotFoundException('Dispositivo não encontrado');
    return device;
  }
}
