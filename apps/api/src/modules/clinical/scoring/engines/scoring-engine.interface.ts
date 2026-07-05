export interface ScoringAnswerInput {
  fieldId: string;
  value: string | null;
  score: number | null;
}

export interface ScoringFieldInput {
  id: string;
  sectionId: string;
  label: string;
  scoringWeight: number | null;
  min: number | null;
  max: number | null;
  required: boolean;
}

export interface ScoringSectionInput {
  id: string;
  title: string;
  order: number;
}

export interface ScoringInput {
  answers: ScoringAnswerInput[];
  fields: ScoringFieldInput[];
  sections: ScoringSectionInput[];
  config?: Record<string, unknown>;
}

export interface SectionScore {
  sectionId: string;
  sectionTitle: string;
  score: number;
  maxScore: number;
  percentage: number;
}

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface ScoringResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  classification: string;
  riskLevel: RiskLevel;
  sectionScores: SectionScore[];
}

export interface ScoringEngine {
  readonly name: string;
  calculate(input: ScoringInput): ScoringResult;
}
