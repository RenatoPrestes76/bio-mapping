export type BiologicalSex = 'MALE' | 'FEMALE' | 'OTHER';

export interface PatientContext {
  age?: number;
  sex?: BiologicalSex;
  pregnant?: boolean;
  conditions?: string[];
}

export interface ReferenceRangeDef {
  biomarker: string;
  lowerBound: number;
  upperBound: number;
  unit: string;
  minAge?: number;
  maxAge?: number;
  sex?: BiologicalSex;
  pregnant?: boolean;
}

export interface AdaptedRange {
  biomarker: string;
  lowerBound: number;
  upperBound: number;
  unit: string;
  source: 'CUSTOM' | 'BUILT_IN';
  contextApplied: string[];
}

export type BiomarkerStatus = 'LOW' | 'NORMAL' | 'HIGH' | 'UNKNOWN';

// Default population ranges for common biomarkers
export const DEFAULT_REFERENCE_RANGES: ReferenceRangeDef[] = [
  { biomarker: 'glucose', lowerBound: 70, upperBound: 99, unit: 'mg/dL' },
  { biomarker: 'hba1c', lowerBound: 4.0, upperBound: 5.6, unit: '%' },
  { biomarker: 'cholesterol', lowerBound: 0, upperBound: 200, unit: 'mg/dL' },
  { biomarker: 'hdl', lowerBound: 40, upperBound: 999, unit: 'mg/dL', sex: 'MALE' },
  { biomarker: 'hdl', lowerBound: 50, upperBound: 999, unit: 'mg/dL', sex: 'FEMALE' },
  { biomarker: 'ldl', lowerBound: 0, upperBound: 130, unit: 'mg/dL' },
  { biomarker: 'triglycerides', lowerBound: 0, upperBound: 150, unit: 'mg/dL' },
  { biomarker: 'systolicBp', lowerBound: 90, upperBound: 120, unit: 'mmHg' },
  { biomarker: 'diastolicBp', lowerBound: 60, upperBound: 80, unit: 'mmHg' },
  { biomarker: 'bmi', lowerBound: 18.5, upperBound: 24.9, unit: 'kg/m²' },
  { biomarker: 'vitaminD', lowerBound: 30, upperBound: 100, unit: 'ng/mL' },
  { biomarker: 'ferritin', lowerBound: 12, upperBound: 300, unit: 'ng/mL', sex: 'MALE' },
  { biomarker: 'ferritin', lowerBound: 12, upperBound: 150, unit: 'ng/mL', sex: 'FEMALE' },
  { biomarker: 'tsh', lowerBound: 0.4, upperBound: 4.0, unit: 'mIU/L' },
  { biomarker: 'creatinine', lowerBound: 0.7, upperBound: 1.3, unit: 'mg/dL', sex: 'MALE' },
  { biomarker: 'creatinine', lowerBound: 0.5, upperBound: 1.1, unit: 'mg/dL', sex: 'FEMALE' },
];

export function findMatchingRange(biomarker: string, context: PatientContext, customRanges?: ReferenceRangeDef[]): ReferenceRangeDef | null {
  const allRanges = [...(customRanges ?? []), ...DEFAULT_REFERENCE_RANGES];
  const lower = biomarker.toLowerCase();

  const candidates = allRanges.filter((r) => {
    if (r.biomarker.toLowerCase() !== lower) return false;
    if (r.sex && context.sex && r.sex !== context.sex) return false;
    if (r.pregnant !== undefined && context.pregnant !== undefined && r.pregnant !== context.pregnant) return false;
    if (r.minAge != null && context.age != null && context.age < r.minAge) return false;
    if (r.maxAge != null && context.age != null && context.age > r.maxAge) return false;
    return true;
  });

  // Prefer sex-specific ranges
  return candidates.find((r) => r.sex === context.sex) ?? candidates[0] ?? null;
}

export function adaptReferenceRange(biomarker: string, context: PatientContext, customRanges?: ReferenceRangeDef[]): AdaptedRange | null {
  const range = findMatchingRange(biomarker, context, customRanges);
  if (!range) return null;

  const contextApplied: string[] = [];
  if (range.sex) contextApplied.push(`sexo: ${range.sex}`);
  if (context.pregnant) contextApplied.push('gestação');
  if (range.minAge || range.maxAge) contextApplied.push('faixa etária');

  return {
    biomarker,
    lowerBound: range.lowerBound,
    upperBound: range.upperBound,
    unit: range.unit,
    source: customRanges?.some((r) => r.biomarker.toLowerCase() === biomarker.toLowerCase()) ? 'CUSTOM' : 'BUILT_IN',
    contextApplied,
  };
}

export function classifyBiomarkerStatus(value: number, range: AdaptedRange | null): BiomarkerStatus {
  if (!range) return 'UNKNOWN';
  if (value < range.lowerBound) return 'LOW';
  if (value > range.upperBound) return 'HIGH';
  return 'NORMAL';
}

export function isWithinRange(value: number, range: AdaptedRange | null): boolean {
  return classifyBiomarkerStatus(value, range) === 'NORMAL';
}
