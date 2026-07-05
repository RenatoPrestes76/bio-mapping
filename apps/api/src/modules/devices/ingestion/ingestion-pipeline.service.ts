import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { MeasurementStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService, AuditContext } from '../../../common/audit/audit-log.service';
import { DeviceEventBusService } from '../events/device-event-bus.service';
import { DeviceEventType } from '../events/device-events';
import { MeasurementNormalizerService } from '../normalizers/measurement-normalizer.service';
import { MeasurementValidationService } from '../validation/measurement-validation.service';
import { ClinicalMapperService } from '../mappers/clinical-mapper.service';
import type { RawMeasurement } from '../drivers/base/device-driver.interface';
import type { NormalizedMeasurement } from '../normalizers/dto/normalized-measurement.dto';
import type { ValidationResult } from '../validation/physiological-limits';

interface Actor { sub: string; role: string }

export interface IngestionResult {
  measurementId: string;
  status: MeasurementStatus;
  normalized: NormalizedMeasurement;
  validation: ValidationResult;
  vitalRecordId: string | null;
}

@Injectable()
export class IngestionPipelineService {
  private readonly logger = new Logger(IngestionPipelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly eventBus: DeviceEventBusService,
    private readonly normalizer: MeasurementNormalizerService,
    private readonly validator: MeasurementValidationService,
    private readonly mapper: ClinicalMapperService,
  ) {}

  async ingest(raw: RawMeasurement, actor: Actor, context: AuditContext): Promise<IngestionResult> {
    this.assertProfessionalOrAdmin(actor);

    const device = await this.prisma.device.findFirst({ where: { id: raw.deviceId, deletedAt: null } });
    if (!device) throw new NotFoundException('Dispositivo não encontrado');

    // 1 — Normalize
    const normalized = this.normalizer.normalize(raw);

    // 2 — Validate
    const validation = this.validator.validate(normalized);
    const status = validation.valid ? MeasurementStatus.VALIDATED : MeasurementStatus.REJECTED;

    // 3 — Persist raw + normalized measurement record
    const record = await this.prisma.deviceMeasurement.create({
      data: {
        deviceId: raw.deviceId,
        patientId: device.patientId ?? null,
        organizationId: device.organizationId ?? null,
        recordedBy: actor.sub,
        driverName: raw.driverName,
        measurementType: raw.measurementType,
        status,
        rawData: raw.rawData as object,
        normalizedData: normalized.values as object,
        unit: normalized.unit,
        validationFlags: validation.flags.length > 0 ? (validation.flags as unknown as object) : undefined,
        recordedAt: raw.timestamp,
      },
    });

    this.logger.log(`Ingested measurement ${record.id} (${raw.measurementType}) — status: ${status}`);

    let vitalRecordId: string | null = null;

    // 4 — Map to clinical record if valid
    if (validation.valid) {
      const mapping = await this.mapper.mapToVitalRecord(normalized, device.patientId ?? undefined, actor);
      vitalRecordId = mapping.vitalRecordId;

      if (mapping.vitalRecordId) {
        await this.prisma.deviceMeasurement.update({
          where: { id: record.id },
          data: { vitalRecordId: mapping.vitalRecordId, status: MeasurementStatus.PROCESSED, processedAt: new Date() },
        });
      }

      this.eventBus.emit(DeviceEventType.MEASUREMENT_RECEIVED, {
        measurementId: record.id,
        deviceId: raw.deviceId,
        measurementType: raw.measurementType,
        timestamp: raw.timestamp,
      });

      this.eventBus.emit(DeviceEventType.MEASUREMENT_VALIDATED, {
        measurementId: record.id,
        deviceId: raw.deviceId,
        vitalRecordId,
        timestamp: new Date(),
      });

      await this.audit.log('MEASUREMENT_PROCESSED', {
        ...context,
        userId: actor.sub,
        metadata: { measurementId: record.id, deviceId: raw.deviceId, vitalRecordId },
      });
    } else {
      this.eventBus.emit(DeviceEventType.MEASUREMENT_REJECTED, {
        measurementId: record.id,
        deviceId: raw.deviceId,
        flags: validation.flags,
        timestamp: new Date(),
      });

      await this.audit.log('MEASUREMENT_REJECTED', {
        ...context,
        userId: actor.sub,
        metadata: { measurementId: record.id, deviceId: raw.deviceId, flags: validation.flags },
      });
    }

    return {
      measurementId: record.id,
      status: vitalRecordId ? MeasurementStatus.PROCESSED : status,
      normalized,
      validation,
      vitalRecordId,
    };
  }

  async getMeasurements(deviceId: string, page = 1, limit = 20) {
    const where = { deviceId };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.deviceMeasurement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { recordedAt: 'desc' },
      }),
      this.prisma.deviceMeasurement.count({ where }),
    ]);
    return { data: records, total, page, limit };
  }

  private assertProfessionalOrAdmin(actor: Actor) {
    if (!['ADMIN', 'PROFESSIONAL', 'DOCTOR'].includes(actor.role)) {
      throw new ForbiddenException('Apenas profissionais podem iniciar medições');
    }
  }
}
