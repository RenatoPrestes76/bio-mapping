export interface ConfidenceInput {
  examCount: number;
  evidenceQuality: number;       // 0–1 (A=1, B=0.8, C=0.6, D=0.4, EXPERT=0.3)
  clinicalConsistency: number;   // 0–1 (fraction of rules consistent with each other)
  biomarkerCount: number;
  hasLongitudinalHistory: boolean;
  dataQuality: number;           // 0–1 (fraction of variables with valid non-null values)
}

const WEIGHTS = {
  examCount: 0.20,
  evidenceQuality: 0.25,
  clinicalConsistency: 0.20,
  biomarkerCount: 0.15,
  longitudinalHistory: 0.10,
  dataQuality: 0.10,
};

const MAX_EXAMS = 10;
const MAX_BIOMARKERS = 5;

export function calculateConfidence(input: ConfidenceInput): number {
  const examScore = Math.min(input.examCount, MAX_EXAMS) / MAX_EXAMS;
  const biomarkerScore = Math.min(input.biomarkerCount, MAX_BIOMARKERS) / MAX_BIOMARKERS;
  const longitudinalScore = input.hasLongitudinalHistory ? 1 : 0;

  const raw =
    examScore * WEIGHTS.examCount +
    Math.max(0, Math.min(1, input.evidenceQuality)) * WEIGHTS.evidenceQuality +
    Math.max(0, Math.min(1, input.clinicalConsistency)) * WEIGHTS.clinicalConsistency +
    biomarkerScore * WEIGHTS.biomarkerCount +
    longitudinalScore * WEIGHTS.longitudinalHistory +
    Math.max(0, Math.min(1, input.dataQuality)) * WEIGHTS.dataQuality;

  return Math.round(raw * 100) / 100;
}

export function evidenceQualityScore(level: string): number {
  const map: Record<string, number> = {
    A: 1.0, B: 0.8, C: 0.6, D: 0.4, EXPERT_OPINION: 0.3,
  };
  return map[level] ?? 0.5;
}

export function interpretConfidence(score: number): string {
  if (score >= 0.9) return 'Muito Alta';
  if (score >= 0.75) return 'Alta';
  if (score >= 0.6) return 'Moderada';
  if (score >= 0.4) return 'Baixa';
  return 'Muito Baixa';
}

export function calculateDataQuality(variables: Record<string, unknown>): number {
  const keys = Object.keys(variables);
  if (keys.length === 0) return 0;
  const validCount = keys.filter((k) => variables[k] !== null && variables[k] !== undefined && variables[k] !== '').length;
  return validCount / keys.length;
}
