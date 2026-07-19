export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains';

export interface CohortFilterDefinition {
  filterKey: string;
  filterOperator: FilterOperator;
  filterValue: string;
}

export type PopulationSegment =
  | 'HEALTHY'
  | 'AT_RISK'
  | 'CHRONIC_DISEASES'
  | 'CARDIOMETABOLIC'
  | 'ONCOLOGY'
  | 'MENTAL_HEALTH'
  | 'WOMENS_HEALTH'
  | 'SENIOR';

export type PatientRecord = Record<string, unknown> & {
  age?: number;
  sex?: string;
  bmi?: number;
  conditions?: string[];
  familyHistory?: string[];
  medications?: string[];
  lifestyle?: string;
  alcohol?: string;
  smoking?: boolean;
  riskLevel?: string;
};

function parseFilterValue(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function evaluateFilter(patient: PatientRecord, filter: CohortFilterDefinition): boolean {
  const raw = patient[filter.filterKey];
  const filterVal = parseFilterValue(filter.filterValue);

  switch (filter.filterOperator) {
    case 'eq': return raw === filterVal;
    case 'neq': return raw !== filterVal;
    case 'gt': return typeof raw === 'number' && typeof filterVal === 'number' && raw > filterVal;
    case 'gte': return typeof raw === 'number' && typeof filterVal === 'number' && raw >= filterVal;
    case 'lt': return typeof raw === 'number' && typeof filterVal === 'number' && raw < filterVal;
    case 'lte': return typeof raw === 'number' && typeof filterVal === 'number' && raw <= filterVal;
    case 'in': return Array.isArray(filterVal) && filterVal.includes(raw);
    case 'not_in': return Array.isArray(filterVal) && !filterVal.includes(raw);
    case 'contains': return Array.isArray(raw) && typeof filterVal === 'string' && raw.includes(filterVal);
    default: return false;
  }
}

export function evaluateCohortFilters(patient: PatientRecord, filters: CohortFilterDefinition[]): boolean {
  if (filters.length === 0) return true;
  return filters.every((f) => evaluateFilter(patient, f));
}

export function countMatchingPatients(patients: PatientRecord[], filters: CohortFilterDefinition[]): number {
  return patients.filter((p) => evaluateCohortFilters(p, filters)).length;
}

const CARDIOMETABOLIC_CONDITIONS = ['diabetes', 'hypertension', 'dyslipidemia', 'obesity', 'metabolic_syndrome'];
const MENTAL_HEALTH_CONDITIONS = ['depression', 'anxiety', 'bipolar', 'schizophrenia'];
const ONCOLOGY_KEYWORDS = ['cancer', 'tumor', 'carcinoma', 'lymphoma', 'leukemia'];
const HIGH_RISK_LEVELS = ['HIGH', 'VERY_HIGH', 'CRITICAL'];

export function segmentPatient(patient: PatientRecord): PopulationSegment {
  const age = patient.age as number | undefined;
  const conditions = (patient.conditions as string[] | undefined) ?? [];
  const riskLevel = patient.riskLevel as string | undefined;
  const sex = (patient.sex as string | undefined)?.toUpperCase();

  if (age !== undefined && age >= 65) return 'SENIOR';

  const lowerConditions = conditions.map((c) => c.toLowerCase());

  if (lowerConditions.some((c) => CARDIOMETABOLIC_CONDITIONS.includes(c))) return 'CARDIOMETABOLIC';
  if (lowerConditions.some((c) => ONCOLOGY_KEYWORDS.some((kw) => c.includes(kw)))) return 'ONCOLOGY';
  if (lowerConditions.some((c) => MENTAL_HEALTH_CONDITIONS.includes(c))) return 'MENTAL_HEALTH';
  if (conditions.length > 0) return 'CHRONIC_DISEASES';
  if (riskLevel && HIGH_RISK_LEVELS.includes(riskLevel)) return 'AT_RISK';
  if (sex === 'FEMALE') return 'WOMENS_HEALTH';

  return 'HEALTHY';
}

export function groupBySegment(patients: PatientRecord[]): Record<PopulationSegment, PatientRecord[]> {
  const result: Record<PopulationSegment, PatientRecord[]> = {
    HEALTHY: [], AT_RISK: [], CHRONIC_DISEASES: [], CARDIOMETABOLIC: [],
    ONCOLOGY: [], MENTAL_HEALTH: [], WOMENS_HEALTH: [], SENIOR: [],
  };
  for (const p of patients) {
    result[segmentPatient(p)].push(p);
  }
  return result;
}
