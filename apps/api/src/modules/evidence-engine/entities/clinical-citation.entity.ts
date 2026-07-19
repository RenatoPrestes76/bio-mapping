export interface ClinicalCitationData {
  id: string;
  evidenceId: string;
  clinicalRuleId?: string;
  guidelineId?: string;
  context: string;
  confidence?: number;
}

export class ClinicalCitation {
  readonly id: string;
  readonly evidenceId: string;
  readonly clinicalRuleId?: string;
  readonly guidelineId?: string;
  readonly context: string;
  readonly confidence: number;

  constructor(data: ClinicalCitationData) {
    this.id = data.id;
    this.evidenceId = data.evidenceId;
    this.clinicalRuleId = data.clinicalRuleId;
    this.guidelineId = data.guidelineId;
    this.context = data.context;
    this.confidence = Math.min(1, Math.max(0, data.confidence ?? 1));
  }

  isHighConfidence(): boolean {
    return this.confidence >= 0.8;
  }
}
