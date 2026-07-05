import { Injectable } from '@nestjs/common';
import { MeasurementType } from '../drivers/base/device-capability';
import { PrismaService } from '../../../database/prisma.service';
import type { NormalizedMeasurement } from '../normalizers/dto/normalized-measurement.dto';

interface Actor { sub: string; role: string }

export interface MappingResult {
  vitalRecordId: string | null;
  mapped: boolean;
  skipped: boolean;
  reason?: string;
}

const MAPPABLE = new Set([
  MeasurementType.WEIGHT,
  MeasurementType.BODY_COMP,
  MeasurementType.BLOOD_PRESSURE,
  MeasurementType.PULSE_OX,
  MeasurementType.HEART_RATE,
  MeasurementType.BLOOD_GLUCOSE,
  MeasurementType.TEMPERATURE,
]);

@Injectable()
export class ClinicalMapperService {
  constructor(private readonly prisma: PrismaService) {}

  canMap(type: MeasurementType): boolean {
    return MAPPABLE.has(type);
  }

  async mapToVitalRecord(
    normalized: NormalizedMeasurement,
    patientId: string | undefined,
    actor: Actor,
  ): Promise<MappingResult> {
    if (!patientId) return { vitalRecordId: null, mapped: false, skipped: true, reason: 'no patientId' };
    if (!this.canMap(normalized.measurementType)) {
      return { vitalRecordId: null, mapped: false, skipped: true, reason: `unsupported type: ${normalized.measurementType}` };
    }

    const data = this.buildVitalData(normalized);
    if (Object.keys(data).length === 0) {
      return { vitalRecordId: null, mapped: false, skipped: true, reason: 'no mappable fields' };
    }

    const record = await this.prisma.vitalRecord.create({
      data: {
        patientId,
        professionalId: null,
        recordedAt: normalized.timestamp,
        source: 'BLUETOOTH' as any,
        status: 'DRAFT' as any,
        notes: `Auto-captured via ${normalized.driverName}`,
        ...data,
      },
    });

    return { vitalRecordId: record.id, mapped: true, skipped: false };
  }

  private buildVitalData(n: NormalizedMeasurement): Record<string, unknown> {
    const v = n.values;
    const data: Record<string, unknown> = {};
    const num = (k: string) => (typeof v[k] === 'number' ? (v[k] as number) : undefined);

    switch (n.measurementType) {
      case MeasurementType.WEIGHT:
        if (num('weight') !== undefined) data['weight'] = num('weight');
        if (num('bmi') !== undefined) data['bmi'] = num('bmi');
        break;

      case MeasurementType.BODY_COMP:
        if (num('weight') !== undefined) data['weight'] = num('weight');
        if (num('bmi') !== undefined) data['bmi'] = num('bmi');
        if (num('bodyFat') !== undefined) data['bodyFatPercentage'] = num('bodyFat');
        if (num('muscleMass') !== undefined) data['leanMass'] = num('muscleMass');
        break;

      case MeasurementType.BLOOD_PRESSURE:
        if (num('systolic') !== undefined) data['bloodPressureSystolic'] = num('systolic');
        if (num('diastolic') !== undefined) data['bloodPressureDiastolic'] = num('diastolic');
        if (num('pulse') !== undefined) data['heartRate'] = num('pulse');
        break;

      case MeasurementType.PULSE_OX:
        if (num('spo2') !== undefined) data['oxygenSaturation'] = num('spo2');
        if (num('heartRate') !== undefined) data['heartRate'] = num('heartRate');
        break;

      case MeasurementType.HEART_RATE:
        if (num('instantHeartRate') !== undefined) data['heartRate'] = num('instantHeartRate');
        break;

      case MeasurementType.BLOOD_GLUCOSE:
        if (num('glucose') !== undefined) data['bloodGlucose'] = num('glucose');
        break;

      case MeasurementType.TEMPERATURE:
        if (num('temperature') !== undefined) data['bodyTemperature'] = num('temperature');
        break;
    }

    return data;
  }
}
