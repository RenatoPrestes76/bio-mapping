import {
  ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { DeviceStatus } from '@bio/database';
import { PrismaService } from '../../../../database/prisma.service';
import { AuditLogService, AuditContext } from '../../../../common/audit/audit-log.service';
import { BleManagerService } from '../../ble/ble-manager.service';
import { PairDeviceDto } from '../dto/pair-device.dto';

interface Actor { sub: string; role: string }

@Injectable()
export class PairingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly ble: BleManagerService,
  ) {}

  async pair(deviceId: string, dto: PairDeviceDto, actor: Actor, context: AuditContext) {
    this.assertProfessionalOrAdmin(actor);

    const device = await this.findDeviceOrFail(deviceId);

    const updated = await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        status: DeviceStatus.PAIRED,
        organizationId: dto.organizationId ?? device.organizationId,
        patientId: dto.patientId ?? device.patientId,
        pairedBy: actor.sub,
        pairedAt: new Date(),
      },
    });

    await this.audit.log('DEVICE_PAIRED', {
      ...context,
      userId: actor.sub,
      metadata: { deviceId, organizationId: updated.organizationId, patientId: updated.patientId },
    });

    return updated;
  }

  async unpair(deviceId: string, actor: Actor, context: AuditContext) {
    this.assertProfessionalOrAdmin(actor);

    const device = await this.findDeviceOrFail(deviceId);

    // Disconnect if currently connected
    if (this.ble.isConnected(deviceId)) {
      this.ble.disconnect(deviceId, undefined, 'unpaired');
    }

    const updated = await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        status: DeviceStatus.DISCONNECTED,
        patientId: null,
        pairedBy: null,
        pairedAt: null,
      },
    });

    await this.audit.log('DEVICE_UNPAIRED', {
      ...context,
      userId: actor.sub,
      metadata: { deviceId, previousPatientId: device.patientId },
    });

    return updated;
  }

  private async findDeviceOrFail(deviceId: string) {
    const device = await this.prisma.device.findFirst({ where: { id: deviceId, deletedAt: null } });
    if (!device) throw new NotFoundException('Dispositivo não encontrado');
    return device;
  }

  private assertProfessionalOrAdmin(actor: Actor) {
    if (actor.role === 'PATIENT') throw new ForbiddenException('Pacientes não podem parear dispositivos');
    if (!['ADMIN', 'PROFESSIONAL', 'DOCTOR'].includes(actor.role)) throw new ForbiddenException();
  }
}
