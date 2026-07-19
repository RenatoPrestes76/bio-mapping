export enum RuleCategory {
  NUTRITION = 'NUTRITION',
  PHYSICAL_ACTIVITY = 'PHYSICAL_ACTIVITY',
  MEDICATION = 'MEDICATION',
  MONITORING = 'MONITORING',
  LIFESTYLE = 'LIFESTYLE',
  MENTAL_HEALTH = 'MENTAL_HEALTH',
  SLEEP = 'SLEEP',
  CARDIAC = 'CARDIAC',
  METABOLIC = 'METABOLIC',
  ENDOCRINE = 'ENDOCRINE',
}

export enum EvidenceLevel {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  I = 'I',
}

export interface PersonalizationRuleData {
  id: string;
  category: RuleCategory;
  condition: string;
  priority: number;
  weight: number;
  recommendation: string;
  evidenceLevel: EvidenceLevel;
  enabled?: boolean;
}

export class PersonalizationRule {
  readonly id: string;
  readonly category: RuleCategory;
  readonly condition: string;
  readonly priority: number;
  readonly weight: number;
  readonly recommendation: string;
  readonly evidenceLevel: EvidenceLevel;
  readonly enabled: boolean;

  constructor(data: PersonalizationRuleData) {
    this.id = data.id;
    this.category = data.category;
    this.condition = data.condition;
    this.priority = Math.min(10, Math.max(1, data.priority));
    this.weight = Math.min(1, Math.max(0, data.weight));
    this.recommendation = data.recommendation;
    this.evidenceLevel = data.evidenceLevel;
    this.enabled = data.enabled ?? true;
  }

  isHighPriority(): boolean {
    return this.priority >= 8;
  }

  isHighEvidence(): boolean {
    return this.evidenceLevel === EvidenceLevel.A || this.evidenceLevel === EvidenceLevel.B;
  }
}
