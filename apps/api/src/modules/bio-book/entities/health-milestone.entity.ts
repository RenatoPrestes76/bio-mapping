export type MilestoneType =
  | 'BIOMARKER_IMPROVEMENT'
  | 'GOAL_ACHIEVED'
  | 'HABIT_CONSISTENCY'
  | 'FIRST_RECORD'
  | 'MEDICATION_OPTIMIZATION'
  | 'RISK_REDUCTION'
  | 'DIAGNOSTIC_INSIGHT'
  | 'LIFESTYLE_ACHIEVEMENT'
  | 'RECOVERY_MILESTONE'
  | 'LONGEVITY_INDICATOR';

export type MilestoneRank = 'MINOR' | 'MAJOR' | 'LANDMARK';

export class HealthMilestone {
  readonly id: string;
  readonly patientId: string;
  readonly milestoneType: MilestoneType;
  readonly title: string;
  readonly description: string;
  readonly achievedAt: Date;
  readonly rank: MilestoneRank;
  readonly metric?: string;
  readonly fromValue?: number;
  readonly toValue?: number;
  readonly unit?: string;
  readonly improvementPercent?: number;
  readonly chapterNumber?: number;

  constructor(params: {
    id?: string;
    patientId: string;
    milestoneType: MilestoneType;
    title: string;
    description: string;
    achievedAt: Date | string;
    rank?: MilestoneRank;
    metric?: string;
    fromValue?: number;
    toValue?: number;
    unit?: string;
    chapterNumber?: number;
  }) {
    this.id = params.id ?? `ms-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.patientId = params.patientId;
    this.milestoneType = params.milestoneType;
    this.title = params.title;
    this.description = params.description;
    this.achievedAt = params.achievedAt instanceof Date ? params.achievedAt : new Date(params.achievedAt);
    this.rank = params.rank ?? 'MINOR';
    this.metric = params.metric;
    this.fromValue = params.fromValue;
    this.toValue = params.toValue;
    this.unit = params.unit;
    this.chapterNumber = params.chapterNumber;

    if (params.fromValue !== undefined && params.toValue !== undefined && params.fromValue !== 0) {
      this.improvementPercent =
        Math.round(((params.fromValue - params.toValue) / Math.abs(params.fromValue)) * 1000) / 10;
    }
  }

  isLandmark(): boolean {
    return this.rank === 'LANDMARK';
  }

  toSummary(): { title: string; description: string; rank: MilestoneRank; achievedAt: Date } {
    return { title: this.title, description: this.description, rank: this.rank, achievedAt: this.achievedAt };
  }
}
