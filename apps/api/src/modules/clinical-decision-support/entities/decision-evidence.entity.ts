export type EvidenceSourceType =
  | 'GUIDELINE'
  | 'CLINICAL_TRIAL'
  | 'META_ANALYSIS'
  | 'SYSTEMATIC_REVIEW'
  | 'COHORT_STUDY'
  | 'PUBMED'
  | 'CPIC'
  | 'DPWG'
  | 'GRADE_REPORT'
  | 'EXPERT_CONSENSUS';

export type GradeLevel = 'A' | 'B' | 'C' | 'D';
export type GradeStrength = 'STRONG' | 'MODERATE' | 'WEAK' | 'CONDITIONAL';

export class DecisionEvidence {
  readonly id: string;
  readonly topic: string;
  readonly sourceType: EvidenceSourceType;
  readonly guidelineId?: string;
  readonly gradeLevel: GradeLevel;
  readonly gradeStrength: GradeStrength;
  readonly title: string;
  readonly summary: string;
  readonly clinicalTrialId?: string;
  readonly pubmedId?: string;
  readonly relevanceScore: number;
  readonly populationSize?: number;
  readonly year?: number;
  readonly linkedRecommendationIds: string[];
  readonly attachedAt: Date;

  constructor(params: {
    id?: string;
    topic: string;
    sourceType: EvidenceSourceType;
    guidelineId?: string;
    gradeLevel: GradeLevel;
    gradeStrength?: GradeStrength;
    title: string;
    summary: string;
    clinicalTrialId?: string;
    pubmedId?: string;
    relevanceScore?: number;
    populationSize?: number;
    year?: number;
    linkedRecommendationIds?: string[];
  }) {
    this.id = params.id ?? `evid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.topic = params.topic;
    this.sourceType = params.sourceType;
    this.guidelineId = params.guidelineId;
    this.gradeLevel = params.gradeLevel;
    this.gradeStrength = params.gradeStrength ?? 'MODERATE';
    this.title = params.title;
    this.summary = params.summary;
    this.clinicalTrialId = params.clinicalTrialId;
    this.pubmedId = params.pubmedId;
    this.relevanceScore = Math.max(0, Math.min(100, params.relevanceScore ?? 50));
    this.populationSize = params.populationSize;
    this.year = params.year;
    this.linkedRecommendationIds = params.linkedRecommendationIds ?? [];
    this.attachedAt = new Date();
  }

  isHighQuality(): boolean {
    return this.gradeLevel === 'A' || (this.gradeLevel === 'B' && this.gradeStrength === 'STRONG');
  }

  isHighlyRelevant(): boolean {
    return this.relevanceScore >= 75;
  }

  getCitationLabel(): string {
    const source = this.pubmedId
      ? `PMID:${this.pubmedId}`
      : this.clinicalTrialId
      ? `Trial:${this.clinicalTrialId}`
      : this.guidelineId ?? this.sourceType;
    return `[${this.gradeLevel}] ${source} — ${this.title}`;
  }
}
