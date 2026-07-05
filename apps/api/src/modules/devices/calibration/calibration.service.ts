import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService, AuditContext } from '../../../common/audit/audit-log.service';
import type { CreateCalibrationDto, CalibrationResponseDto } from './dto/calibration.dto';

interface Actor { sub: string; role: string }

@Injectable()
export class CalibrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async create(deviceId: string, dto: CreateCalibrationDto, actor: Actor, context: AuditContext): Promise<CalibrationResponseDto> {
    this.assertProfessionalOrAdmin(actor);

    const device = await this.prisma.device.findFirst({ where: { id: deviceId, deletedAt: null } });
    if (!device) throw new NotFoundException('Dispositivo não encontrado');

    const calibration = await this.prisma.deviceCalibration.create({
      data: {
        deviceId,
        calibratedBy: actor.sub,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        notes: dto.notes ?? null,
        referenceValues: dto.referenceValues ?? undefined,
        isValid: true,
      },
    });

    await this.audit.log('CALIBRATION_CREATED', {
      ...context,
      userId: actor.sub,
      metadata: { deviceId, calibrationId: calibration.id },
    });

    return this.toResponse(calibration);
  }

  async findByDevice(deviceId: string): Promise<CalibrationResponseDto[]> {
    const records = await this.prisma.deviceCalibration.findMany({
      where: { deviceId },
      orderBy: { calibratedAt: 'desc' },
    });
    return records.map(this.toResponse);
  }

  async getLatest(deviceId: string): Promise<CalibrationResponseDto | null> {
    const record = await this.prisma.deviceCalibration.findFirst({
      where: { deviceId, isValid: true },
      orderBy: { calibratedAt: 'desc' },
    });
    return record ? this.toResponse(record) : null;
  }

  async invalidate(calibrationId: string, actor: Actor, context: AuditContext): Promise<void> {
    this.assertProfessionalOrAdmin(actor);
    await this.prisma.deviceCalibration.update({
      where: { id: calibrationId },
      data: { isValid: false },
    });
    await this.audit.log('CALIBRATION_EXPIRED', {
      ...context,
      userId: actor.sub,
      metadata: { calibrationId },
    });
  }

  async isExpired(deviceId: string): Promise<boolean> {
    const latest = await this.getLatest(deviceId);
    if (!latest) return false;
    if (!latest.expiresAt) return false;
    return new Date() > new Date(latest.expiresAt);
  }

  private toResponse(c: any): CalibrationResponseDto {
    return {
      id: c.id,
      deviceId: c.deviceId,
      calibratedBy: c.calibratedBy,
      calibratedAt: c.calibratedAt,
      expiresAt: c.expiresAt ?? null,
      notes: c.notes ?? null,
      referenceValues: (c.referenceValues as Record<string, number> | null) ?? null,
      isValid: c.isValid,
    };
  }

  private assertProfessionalOrAdmin(actor: Actor) {
    if (!['ADMIN', 'PROFESSIONAL', 'DOCTOR'].includes(actor.role)) {
      throw new ForbiddenException('Apenas profissionais podem calibrar dispositivos');
    }
  }
}
