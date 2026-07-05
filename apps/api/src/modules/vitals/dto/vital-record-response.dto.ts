import type { VitalRecord, Biomarker, VitalRecordHistory } from '@bio/database';
import {
  BmiClassification,
  BloodPressureClassification,
  GlucoseClassification,
  calculateBmi,
  calculateWaistHipRatio,
  classifyBmi,
  classifyBloodPressure,
  classifyBloodGlucose,
} from '../calculators/vital-calculators';

export class BiomarkerInRecordDto {
  id!: string;
  name!: string;
  value!: number;
  unit!: string;
  referenceMin?: number | null;
  referenceMax?: number | null;
  status!: string;
  notes?: string | null;
}

export class HistoryEntryDto {
  id!: string;
  field!: string;
  previousValue?: string | null;
  newValue?: string | null;
  changedBy!: string;
  changedAt!: Date;
}

export class VitalRecordResponseDto {
  id!: string;
  patientId!: string;
  professionalId?: string | null;
  organizationId?: string | null;
  recordedAt!: Date;
  source!: string;
  status!: string;
  notes?: string | null;

  // Medidas antropométricas
  height?: number | null;
  weight?: number | null;
  bmi?: number | null;
  bodyFatPercentage?: number | null;
  leanMass?: number | null;
  fatMass?: number | null;
  visceralFat?: number | null;
  waistCircumference?: number | null;
  hipCircumference?: number | null;
  neckCircumference?: number | null;
  chestCircumference?: number | null;
  armCircumference?: number | null;
  thighCircumference?: number | null;
  calfCircumference?: number | null;

  // Sinais vitais
  heartRate?: number | null;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  respiratoryRate?: number | null;
  bodyTemperature?: number | null;
  oxygenSaturation?: number | null;
  bloodGlucose?: number | null;

  // Indicadores calculados (derivados — nunca armazenados com estado)
  bmiClassification?: BmiClassification;
  bloodPressureClassification?: BloodPressureClassification;
  glucoseClassification?: GlucoseClassification;
  waistHipRatio?: number;

  biomarkers?: BiomarkerInRecordDto[];
  history?: HistoryEntryDto[];

  createdAt!: Date;
  updatedAt!: Date;
}

type VitalRecordWithRelations = VitalRecord & {
  biomarkers?: Biomarker[];
  history?: VitalRecordHistory[];
};

export function toVitalRecordResponse(
  record: VitalRecordWithRelations,
): VitalRecordResponseDto {
  const dto = new VitalRecordResponseDto();

  // Campos simples
  Object.assign(dto, {
    id: record.id,
    patientId: record.patientId,
    professionalId: record.professionalId,
    organizationId: record.organizationId,
    recordedAt: record.recordedAt,
    source: record.source,
    status: record.status,
    notes: record.notes,
    height: record.height,
    weight: record.weight,
    bmi: record.bmi,
    bodyFatPercentage: record.bodyFatPercentage,
    leanMass: record.leanMass,
    fatMass: record.fatMass,
    visceralFat: record.visceralFat,
    waistCircumference: record.waistCircumference,
    hipCircumference: record.hipCircumference,
    neckCircumference: record.neckCircumference,
    chestCircumference: record.chestCircumference,
    armCircumference: record.armCircumference,
    thighCircumference: record.thighCircumference,
    calfCircumference: record.calfCircumference,
    heartRate: record.heartRate,
    bloodPressureSystolic: record.bloodPressureSystolic,
    bloodPressureDiastolic: record.bloodPressureDiastolic,
    respiratoryRate: record.respiratoryRate,
    bodyTemperature: record.bodyTemperature,
    oxygenSaturation: record.oxygenSaturation,
    bloodGlucose: record.bloodGlucose,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });

  // Indicadores derivados — calculados on-the-fly, não armazenados separadamente.
  // Isso garante que ao evoluirmos os algoritmos, histórico pode ser recalculado.
  const effectiveBmi = record.bmi ?? (record.weight && record.height
    ? calculateBmi(record.weight, record.height)
    : null);

  if (effectiveBmi) {
    dto.bmi = effectiveBmi;
    dto.bmiClassification = classifyBmi(effectiveBmi);
  }

  if (record.bloodPressureSystolic && record.bloodPressureDiastolic) {
    dto.bloodPressureClassification = classifyBloodPressure(
      record.bloodPressureSystolic,
      record.bloodPressureDiastolic,
    );
  }

  if (record.bloodGlucose) {
    dto.glucoseClassification = classifyBloodGlucose(record.bloodGlucose);
  }

  if (record.waistCircumference && record.hipCircumference) {
    dto.waistHipRatio = calculateWaistHipRatio(
      record.waistCircumference,
      record.hipCircumference,
    );
  }

  if (record.biomarkers) {
    dto.biomarkers = record.biomarkers.map((b) => ({
      id: b.id,
      name: b.name,
      value: b.value,
      unit: b.unit,
      referenceMin: b.referenceMin,
      referenceMax: b.referenceMax,
      status: b.status,
      notes: b.notes,
    }));
  }

  if (record.history) {
    dto.history = record.history.map((h) => ({
      id: h.id,
      field: h.field,
      previousValue: h.previousValue,
      newValue: h.newValue,
      changedBy: h.changedBy,
      changedAt: h.changedAt,
    }));
  }

  return dto;
}
