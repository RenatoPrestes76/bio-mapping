export type DecisionType =
  | 'DIAGNOSTIC'
  | 'THERAPEUTIC'
  | 'PREVENTIVE'
  | 'MONITORING'
  | 'REFERRAL'
  | 'COMPREHENSIVE';

export type DecisionPriority = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'INFORMATIONAL';
export type DecisionStatus = 'DRAFT' | 'CONFIRMED' | 'PENDING_REVIEW' | 'REJECTED' | 'SUPERSEDED';
export type RecommendationCategory = 'MEDICATION' | 'GENOMICS' | 'PHARMACOGENOMICS' | 'LIFESTYLE' | 'MONITORING' | 'REFERRAL' | 'DIAGNOSTIC';

export interface ClinicalRecommendationItem {
  id: string;
  category: RecommendationCategory;
  action: string;
  rationale: string;
  urgency: 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM' | 'ROUTINE';
  confidenceContribution: number;
  sourceModule: string;
  evidenceLevel?: 'A' | 'B' | 'C' | 'D';
  contraindications?: string[];
  alternatives?: string[];
}

export interface EvidenceContribution {
  sourceModule: string;
  evidenceType: 'CLINICAL_STUDY' | 'GUIDELINE' | 'GENOMIC' | 'PHARMACOGENOMIC' | 'CLINICAL_REASONING' | 'PERSONALIZED';
  summary: string;
  confidenceWeight: number;
  dataCompleteness: number;
}

export interface DecisionExplanation {
  summary: string;
  contributingModules: string[];
  keyFindings: string[];
  conflictsResolved: number;
  reasoningChain: string[];
  limitations: string[];
  dataCompleteness: number;
  modulesQueried: string[];
  modulesWithData: string[];
}

export interface ConflictRecord {
  id: string;
  conflictType: 'DRUG_CONTRAINDICATION' | 'DUPLICATE_THERAPY' | 'RISK_BENEFIT' | 'EVIDENCE_CONFLICT' | 'DOSE_CONFLICT';
  description: string;
  resolution: string;
  resolutionStrategy: 'CONTRAINDICATION_WINS' | 'EVIDENCE_HIERARCHY' | 'SEVERITY_HIERARCHY' | 'CLINICAL_JUDGMENT';
  affectedRecommendations: string[];
  resolvedAt: Date;
}

export class ClinicalDecision {
  readonly id: string;
  readonly patientId: string;
  readonly decisionType: DecisionType;
  readonly priority: DecisionPriority;
  readonly status: DecisionStatus;
  readonly confidence: number;
  readonly clinicalSummary: string;
  readonly recommendations: ClinicalRecommendationItem[];
  readonly evidence: EvidenceContribution[];
  readonly explanation: DecisionExplanation;
  readonly conflictsResolved: ConflictRecord[];
  readonly contributingModules: string[];
  readonly generatedAt: Date;
  readonly version: string;

  constructor(params: {
    id?: string;
    patientId: string;
    decisionType: DecisionType;
    priority: DecisionPriority;
    status?: DecisionStatus;
    confidence: number;
    clinicalSummary: string;
    recommendations: ClinicalRecommendationItem[];
    evidence: EvidenceContribution[];
    explanation: DecisionExplanation;
    conflictsResolved?: ConflictRecord[];
    contributingModules: string[];
    version?: string;
  }) {
    this.id = params.id ?? `cds-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.patientId = params.patientId;
    this.decisionType = params.decisionType;
    this.priority = params.priority;
    this.status = params.status ?? 'DRAFT';
    this.confidence = Math.max(0, Math.min(100, params.confidence));
    this.clinicalSummary = params.clinicalSummary;
    this.recommendations = params.recommendations;
    this.evidence = params.evidence;
    this.explanation = params.explanation;
    this.conflictsResolved = params.conflictsResolved ?? [];
    this.contributingModules = params.contributingModules;
    this.generatedAt = new Date();
    this.version = params.version ?? '1.0.0';
  }

  isHighConfidence(): boolean {
    return this.confidence >= 75;
  }

  isCritical(): boolean {
    return this.priority === 'CRITICAL';
  }

  hasConflicts(): boolean {
    return this.conflictsResolved.length > 0;
  }

  getActionableRecommendations(): ClinicalRecommendationItem[] {
    return this.recommendations.filter((r) => r.urgency === 'IMMEDIATE' || r.urgency === 'SHORT_TERM');
  }

  getRecommendationsByCategory(category: RecommendationCategory): ClinicalRecommendationItem[] {
    return this.recommendations.filter((r) => r.category === category);
  }

  requiresImmediateAction(): boolean {
    return this.recommendations.some((r) => r.urgency === 'IMMEDIATE');
  }

  getPrimaryRecommendation(): ClinicalRecommendationItem | undefined {
    return this.recommendations.sort((a, b) => b.confidenceContribution - a.confidenceContribution)[0];
  }

  toSummary(): { id: string; patientId: string; priority: DecisionPriority; confidence: number; recommendationCount: number } {
    return {
      id: this.id,
      patientId: this.patientId,
      priority: this.priority,
      confidence: this.confidence,
      recommendationCount: this.recommendations.length,
    };
  }
}
