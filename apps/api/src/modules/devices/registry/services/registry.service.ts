import {
  ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { DeviceStatus, ConnectionType } from '@bio/database';
import { PrismaService } from '../../../../database/prisma.service';
import { AuditLogService, AuditContext } from '../../../../common/audit/audit-log.service';
import { BleManagerService } from '../../ble/ble-manager.service';
import { RegisterDeviceDto } from '../../pairing/dto/pair-device.dto';
import { FilterDevicesDto } from '../dto/filter-devices.dto';
import { toDeviceResponse } from '../dto/device-response.dto';
import { DeviceStatisticsDto } from '../dto/device-statistics.dto';
import { paginated } from '../../../../common/dto/pagination.dto';

interface Actor { sub: string; role: string }

@Injectable()
export class RegistryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly ble: BleManagerService,
  ) {}

  // ── Register ───────────────────────────────────────────────────────────────

  async register(dto: RegisterDeviceDto, actor: Actor, context: AuditContext) {
    this.assertNotPatient(actor);

    const device = await this.prisma.device.create({
      data: {
        name: dto.name,
        manufacturer: dto.manufacturer,
        model: dto.model,
        serialNumber: dto.serialNumber,
        firmwareVersion: dto.firmwareVersion,
        connectionType: (dto.connectionType as ConnectionType) ?? ConnectionType.BLE,
        macAddress: dto.macAddress,
        organizationId: dto.organizationId ?? null,
        patientId: dto.patientId ?? null,
        status: DeviceStatus.DISCOVERED,
      },
    });

    await this.audit.log('DEVICE_REGISTERED', {
      ...context,
      userId: actor.sub,
      metadata: { deviceId: device.id, name: device.name, connectionType: device.connectionType },
    });

    return toDeviceResponse(device);
  }

  // ── Find all ───────────────────────────────────────────────────────────────

  async findAll(dto: FilterDevicesDto, actor: Actor) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const where: any = { deletedAt: null };
    if (dto.status) where.status = dto.status;
    if (dto.connectionType) where.connectionType = dto.connectionType;
    if (dto.organizationId) where.organizationId = dto.organizationId;
    if (dto.patientId) where.patientId = dto.patientId;
    if (dto.manufacturer) where.manufacturer = { contains: dto.manufacturer, mode: 'insensitive' };

    // PATIENT can only see their own devices
    if (actor.role === 'PATIENT') {
      const patient = await this.prisma.patient.findFirst({ where: { userId: actor.sub, deletedAt: null } });
      where.patientId = patient?.id ?? 'none';
    }

    const [devices, total] = await this.prisma.$transaction([
      this.prisma.device.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.device.count({ where }),
    ]);

    return paginated(devices.map(toDeviceResponse), total, page, limit);
  }

  // ── Find one ───────────────────────────────────────────────────────────────

  async findOne(id: string, actor: Actor) {
    const device = await this.prisma.device.findFirst({ where: { id, deletedAt: null } });
    if (!device) throw new NotFoundException('Dispositivo não encontrado');
    await this.assertReadAccess(device, actor);
    return toDeviceResponse(device);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async update(id: string, dto: Partial<RegisterDeviceDto>, actor: Actor, context: AuditContext) {
    this.assertNotPatient(actor);
    const device = await this.prisma.device.findFirst({ where: { id, deletedAt: null } });
    if (!device) throw new NotFoundException('Dispositivo não encontrado');

    const updated = await this.prisma.device.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.manufacturer !== undefined && { manufacturer: dto.manufacturer }),
        ...(dto.model !== undefined && { model: dto.model }),
        ...(dto.firmwareVersion !== undefined && { firmwareVersion: dto.firmwareVersion }),
        ...(dto.patientId !== undefined && { patientId: dto.patientId }),
        ...(dto.organizationId !== undefined && { organizationId: dto.organizationId }),
      },
    });

    await this.audit.log('DEVICE_UPDATED', {
      ...context,
      userId: actor.sub,
      metadata: { deviceId: id },
    });

    return toDeviceResponse(updated);
  }

  // ── Delete (soft) ──────────────────────────────────────────────────────────

  async remove(id: string, actor: Actor, context: AuditContext) {
    this.assertNotPatient(actor);
    const device = await this.prisma.device.findFirst({ where: { id, deletedAt: null } });
    if (!device) throw new NotFoundException('Dispositivo não encontrado');

    if (this.ble.isConnected(id)) {
      this.ble.disconnect(id, undefined, 'device deleted');
    }

    await this.prisma.device.update({ where: { id }, data: { deletedAt: new Date(), status: DeviceStatus.DISCONNECTED } });

    await this.audit.log('DEVICE_DELETED', {
      ...context,
      userId: actor.sub,
      metadata: { deviceId: id },
    });
  }

  // ── Statistics ─────────────────────────────────────────────────────────────

  async getStatistics(actor: Actor): Promise<DeviceStatisticsDto> {
    const where: any = { deletedAt: null };
    if (actor.role === 'PATIENT') {
      const patient = await this.prisma.patient.findFirst({ where: { userId: actor.sub, deletedAt: null } });
      where.patientId = patient?.id ?? 'none';
    }

    const devices = await this.prisma.device.findMany({ where });

    const byStatus = (s: string) => devices.filter((d) => d.status === s).length;
    const withBattery = devices.filter((d) => d.batteryLevel !== null);
    const connectionTypes: Record<string, number> = {};
    for (const d of devices) {
      connectionTypes[d.connectionType] = (connectionTypes[d.connectionType] ?? 0) + 1;
    }

    const lastSession = await this.prisma.deviceSession.findFirst({
      where: { device: { deletedAt: null } },
      orderBy: { startedAt: 'desc' },
    });

    return {
      totalDevices: devices.length,
      connectedDevices: byStatus('CONNECTED'),
      pairedDevices: byStatus('PAIRED'),
      offlineDevices: byStatus('DISCONNECTED'),
      errorDevices: byStatus('ERROR'),
      discoveredDevices: byStatus('DISCOVERED'),
      devicesWithBattery: withBattery.length,
      avgBatteryLevel: withBattery.length > 0
        ? Math.round(withBattery.reduce((sum, d) => sum + d.batteryLevel!, 0) / withBattery.length)
        : null,
      avgSignalQuality: devices.filter((d) => d.avgSignalQuality !== null).length > 0
        ? devices.filter((d) => d.avgSignalQuality !== null).reduce((s, d) => s + d.avgSignalQuality!, 0) /
          devices.filter((d) => d.avgSignalQuality !== null).length
        : null,
      connectionTypes,
      lastSync: lastSession?.startedAt ?? null,
    };
  }

  // ── Access helpers ─────────────────────────────────────────────────────────

  private async assertReadAccess(device: any, actor: Actor) {
    if (actor.role === 'ADMIN') return;
    if (actor.role === 'PATIENT') {
      const patient = await this.prisma.patient.findFirst({ where: { userId: actor.sub, deletedAt: null } });
      if (!patient || device.patientId !== patient.id) throw new ForbiddenException('Acesso negado');
    }
  }

  private assertNotPatient(actor: Actor) {
    if (actor.role === 'PATIENT') throw new ForbiddenException('Pacientes não podem gerenciar dispositivos');
  }
}
