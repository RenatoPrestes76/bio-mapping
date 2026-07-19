import { ClinicalCase, BiomarkerValue } from '../entities/clinical-case.entity.js';
import { ReasoningStep } from '../entities/reasoning-step.entity.js';

export interface HypothesisCandidate {
  condition: string;
  icdCode?: string;
  rawProbability: number;
  rawConfidence: number;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  recommendedActions: string[];
  strategyName: string;
}

export interface NormalizedCaseData {
  riskScore: number;
  hasCardiovascularRisk: boolean;
  hasMetabolicRisk: boolean;
  hasEndocrineRisk: boolean;
  abnormalBiomarkers: BiomarkerValue[];
  criticalBiomarkers: BiomarkerValue[];
}

export class ReasoningContext {
  readonly clinicalCase: ClinicalCase;
  readonly normalizedData: NormalizedCaseData;
  readonly candidates: HypothesisCandidate[] = [];
  readonly steps: ReasoningStep[] = [];
  private readonly metadata = new Map<string, unknown>();

  constructor(clinicalCase: ClinicalCase, normalizedData: NormalizedCaseData) {
    this.clinicalCase = clinicalCase;
    this.normalizedData = normalizedData;
  }

  addCandidates(candidates: HypothesisCandidate[]): void {
    this.candidates.push(...candidates);
  }

  addStep(step: ReasoningStep): void {
    this.steps.push(step);
  }

  setMeta(key: string, value: unknown): void {
    this.metadata.set(key, value);
  }

  getMeta<T>(key: string): T | undefined {
    return this.metadata.get(key) as T | undefined;
  }
}
