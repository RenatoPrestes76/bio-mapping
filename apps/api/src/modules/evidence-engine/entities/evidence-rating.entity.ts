export enum GradeQuality {
  HIGH = 'HIGH',
  MODERATE = 'MODERATE',
  LOW = 'LOW',
  VERY_LOW = 'VERY_LOW',
}

export enum RecommendationStrength {
  STRONG = 'STRONG',
  CONDITIONAL = 'CONDITIONAL',
  WEAK = 'WEAK',
}

export enum RiskOfBias {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
}

export type ConsistencyLevel = 'CONSISTENT' | 'INCONSISTENT';
export type DirectnessLevel = 'DIRECT' | 'INDIRECT';
export type PrecisionLevel = 'PRECISE' | 'IMPRECISE';

export interface EvidenceRatingData {
  id: string;
  evidenceId: string;
  grade: GradeQuality;
  quality: number;
  strength: RecommendationStrength;
  riskOfBias?: RiskOfBias;
  consistency?: ConsistencyLevel;
  directness?: DirectnessLevel;
  precision?: PrecisionLevel;
}

const GRADE_SCORE: Record<GradeQuality, number> = {
  [GradeQuality.HIGH]: 1.0,
  [GradeQuality.MODERATE]: 0.75,
  [GradeQuality.LOW]: 0.5,
  [GradeQuality.VERY_LOW]: 0.25,
};

const BIAS_SCORE: Record<RiskOfBias, number> = {
  [RiskOfBias.LOW]: 1.0,
  [RiskOfBias.MODERATE]: 0.7,
  [RiskOfBias.HIGH]: 0.4,
};

export class EvidenceRating {
  readonly id: string;
  readonly evidenceId: string;
  readonly grade: GradeQuality;
  readonly quality: number;
  readonly strength: RecommendationStrength;
  readonly riskOfBias: RiskOfBias;
  readonly consistency: ConsistencyLevel;
  readonly directness: DirectnessLevel;
  readonly precision: PrecisionLevel;

  constructor(data: EvidenceRatingData) {
    this.id = data.id;
    this.evidenceId = data.evidenceId;
    this.grade = data.grade;
    this.quality = Math.min(100, Math.max(0, data.quality));
    this.strength = data.strength;
    this.riskOfBias = data.riskOfBias ?? RiskOfBias.MODERATE;
    this.consistency = data.consistency ?? 'CONSISTENT';
    this.directness = data.directness ?? 'DIRECT';
    this.precision = data.precision ?? 'PRECISE';
  }

  overallScore(): number {
    const gradeScore = GRADE_SCORE[this.grade];
    const biasScore = BIAS_SCORE[this.riskOfBias];
    const consistencyScore = this.consistency === 'CONSISTENT' ? 1.0 : 0.6;
    const directnessScore = this.directness === 'DIRECT' ? 1.0 : 0.7;
    const precisionScore = this.precision === 'PRECISE' ? 1.0 : 0.7;
    return gradeScore * biasScore * consistencyScore * directnessScore * precisionScore * (this.quality / 100);
  }

  isHighQuality(): boolean {
    return this.grade === GradeQuality.HIGH || this.grade === GradeQuality.MODERATE;
  }

  isStrongRecommendation(): boolean {
    return this.strength === RecommendationStrength.STRONG;
  }
}
