import type { Biomarker, BiomarkerStatus } from '@bio/database';

export class BiomarkerResponseDto {
  id!: string;
  vitalRecordId!: string;
  name!: string;
  value!: number;
  unit!: string;
  referenceMin?: number | null;
  referenceMax?: number | null;
  status!: BiomarkerStatus;
  notes?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export function toBiomarkerResponse(b: Biomarker): BiomarkerResponseDto {
  return {
    id: b.id,
    vitalRecordId: b.vitalRecordId,
    name: b.name,
    value: b.value,
    unit: b.unit,
    referenceMin: b.referenceMin,
    referenceMax: b.referenceMax,
    status: b.status,
    notes: b.notes,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}
