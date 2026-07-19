export const MINIMUM_COHORT_SIZE = 10;

export function shouldSuppress(cohortSize: number): boolean {
  return cohortSize < MINIMUM_COHORT_SIZE;
}

export function pseudonymizeId(patientId: string, salt: string): string {
  let hash = 5381;
  const input = `${salt}:${patientId}`;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
    hash = hash >>> 0;
  }
  return `anon_${hash.toString(16).padStart(8, '0')}`;
}

export function applyAggregationMinimum<T>(value: T, cohortSize: number): T | null {
  return shouldSuppress(cohortSize) ? null : value;
}

export interface SuppressionResult {
  suppressed: true;
  reason: string;
}

export function sanitizeCohortResult<T extends Record<string, unknown>>(
  result: T,
  cohortSize: number,
): Omit<T, 'patientId' | 'id'> | SuppressionResult {
  if (shouldSuppress(cohortSize)) {
    return {
      suppressed: true as const,
      reason: `Grupo com ${cohortSize} paciente(s) — abaixo do mínimo de ${MINIMUM_COHORT_SIZE} para exibição (LGPD).`,
    };
  }
  const { patientId, id, ...safe } = result as Record<string, unknown>;
  void patientId; void id;
  return safe as Omit<T, 'patientId' | 'id'>;
}

export function computeAgeRange(ages: number[]): { min: number; max: number; mean: number } | null {
  if (shouldSuppress(ages.length)) return null;
  const sorted = [...ages].sort((a, b) => a - b);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: parseFloat((ages.reduce((s, v) => s + v, 0) / ages.length).toFixed(1)),
  };
}

export function roundToPrivacyBucket(value: number, bucketSize = 5): number {
  return Math.round(value / bucketSize) * bucketSize;
}

export function pseudonymizeList(patientIds: string[], salt: string): string[] {
  return patientIds.map((id) => pseudonymizeId(id, salt));
}
