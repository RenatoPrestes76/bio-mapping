export type RuleEvidenceLevel = 'A' | 'B' | 'C' | 'D' | 'EXPERT_OPINION';

export class ClinicalRule {
  readonly id: string;
  readonly category: string;
  readonly condition: string;
  readonly recommendation: string;
  readonly evidenceLevel: RuleEvidenceLevel;
  readonly priority: number;
  readonly source: string;
  readonly tags: string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: {
    id: string;
    category: string;
    condition: string;
    recommendation: string;
    evidenceLevel: RuleEvidenceLevel;
    priority: number;
    source: string;
    tags?: string[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = data.id;
    this.category = data.category;
    this.condition = data.condition;
    this.recommendation = data.recommendation;
    this.evidenceLevel = data.evidenceLevel;
    this.priority = data.priority;
    this.source = data.source;
    this.tags = data.tags ?? [];
    this.createdAt = data.createdAt ?? new Date();
    this.updatedAt = data.updatedAt ?? new Date();
  }

  matchesCondition(query: string): boolean {
    const q = query.toLowerCase();
    return (
      this.condition.toLowerCase().includes(q) ||
      this.recommendation.toLowerCase().includes(q) ||
      this.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
}
