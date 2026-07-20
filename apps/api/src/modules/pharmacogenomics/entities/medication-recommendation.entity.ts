import type { MetabolicPhenotype, RecommendationSeverity, PGxEvidenceLevel } from './drug-gene-interaction.entity.js';

export interface ExplainableDecision {
  genotypeDescription: string;
  phenotypeDescription: string;
  guidelineUsed: string;
  clinicalRationale: string;
  decisionPath: string[];
  gradeStrength: 'STRONG' | 'MODERATE' | 'WEAK' | 'INSUFFICIENT';
}

export interface EvidenceSummary {
  level: PGxEvidenceLevel;
  source: string;
  gradeStrength: string;
  confidence: number;
  lastUpdated?: string;
}

export class MedicationRecommendation {
  readonly id: string;
  readonly drug: string;
  readonly gene: string;
  readonly phenotype: MetabolicPhenotype;
  readonly severity: RecommendationSeverity;
  readonly recommendation: string;
  readonly alternativeMedications: string[];
  readonly notes?: string;
  readonly explanation: ExplainableDecision;
  readonly evidence: EvidenceSummary;
  readonly generatedAt: Date;

  constructor(params: {
    id?: string;
    drug: string;
    gene: string;
    phenotype: MetabolicPhenotype;
    severity: RecommendationSeverity;
    recommendation: string;
    alternativeMedications?: string[];
    notes?: string;
    explanation: ExplainableDecision;
    evidence: EvidenceSummary;
  }) {
    this.id = params.id ?? `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.drug = params.drug.toLowerCase();
    this.gene = params.gene.toUpperCase();
    this.phenotype = params.phenotype;
    this.severity = params.severity;
    this.recommendation = params.recommendation;
    this.alternativeMedications = params.alternativeMedications ?? [];
    this.notes = params.notes;
    this.explanation = params.explanation;
    this.evidence = params.evidence;
    this.generatedAt = new Date();
  }

  isActionable(): boolean {
    return this.severity !== 'NO_ACTION_NEEDED';
  }

  isContraindicated(): boolean {
    return this.severity === 'CONTRAINDICATED';
  }

  needsAlternative(): boolean {
    return (this.severity === 'CONTRAINDICATED' || this.severity === 'AVOID') && this.alternativeMedications.length > 0;
  }

  getDecisionSummary(): string {
    return `${this.gene} ${this.explanation.phenotypeDescription}: ${this.recommendation}`;
  }
}
