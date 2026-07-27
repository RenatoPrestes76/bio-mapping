export type InsightCategory =
  | 'EVOLUTION'
  | 'PATTERN'
  | 'ACHIEVEMENT'
  | 'RISK'
  | 'OPPORTUNITY'
  | 'CORRELATION';

export type InsightStrength = 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';

export class PersonalInsight {
  readonly id: string;
  readonly patientId: string;
  readonly category: InsightCategory;
  readonly title: string;
  readonly text: string;
  readonly strength: InsightStrength;
  readonly evidences: string[];
  readonly tags: string[];
  readonly fromDate?: Date;
  readonly toDate?: Date;
  readonly generatedAt: Date;

  constructor(params: {
    id?: string;
    patientId: string;
    category: InsightCategory;
    title: string;
    text: string;
    strength?: InsightStrength;
    evidences?: string[];
    tags?: string[];
    fromDate?: Date;
    toDate?: Date;
  }) {
    this.id = params.id ?? `ins-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.patientId = params.patientId;
    this.category = params.category;
    this.title = params.title;
    this.text = params.text;
    this.strength = params.strength ?? 'MODERATE';
    this.evidences = params.evidences ?? [];
    this.tags = params.tags ?? [];
    this.fromDate = params.fromDate;
    this.toDate = params.toDate;
    this.generatedAt = new Date();
  }

  isActionable(): boolean {
    return this.category === 'OPPORTUNITY' || this.category === 'RISK';
  }

  isPositive(): boolean {
    return this.category === 'ACHIEVEMENT' || this.category === 'EVOLUTION';
  }

  isStrong(): boolean {
    return this.strength === 'STRONG' || this.strength === 'VERY_STRONG';
  }

  toSummary(): { id: string; category: InsightCategory; title: string; strength: InsightStrength } {
    return { id: this.id, category: this.category, title: this.title, strength: this.strength };
  }
}
