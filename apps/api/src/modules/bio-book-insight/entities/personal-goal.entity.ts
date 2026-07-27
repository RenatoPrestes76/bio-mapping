export type GoalStatus = 'ON_TRACK' | 'AT_RISK' | 'ACHIEVED' | 'PAUSED' | 'NOT_STARTED';
export type GoalCategory =
  | 'METABOLIC'
  | 'CARDIOVASCULAR'
  | 'WEIGHT'
  | 'LIFESTYLE'
  | 'MEDICATION'
  | 'LONGEVITY';

export class PersonalGoal {
  readonly id: string;
  readonly patientId: string;
  readonly category: GoalCategory;
  readonly title: string;
  readonly description: string;
  readonly targetDescription: string;
  readonly progressPercent: number;
  readonly status: GoalStatus;
  readonly evidences: string[];
  readonly startedAt: Date;
  readonly estimatedCompletion?: Date;

  constructor(params: {
    id?: string;
    patientId: string;
    category: GoalCategory;
    title: string;
    description: string;
    targetDescription: string;
    progressPercent?: number;
    status?: GoalStatus;
    evidences?: string[];
    startedAt: Date;
    estimatedCompletion?: Date;
  }) {
    this.id = params.id ?? `goal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.patientId = params.patientId;
    this.category = params.category;
    this.title = params.title;
    this.description = params.description;
    this.targetDescription = params.targetDescription;
    this.progressPercent = Math.max(0, Math.min(100, params.progressPercent ?? 0));
    this.status = params.status ?? 'NOT_STARTED';
    this.evidences = params.evidences ?? [];
    this.startedAt = params.startedAt;
    this.estimatedCompletion = params.estimatedCompletion;
  }

  isCompleted(): boolean {
    return this.status === 'ACHIEVED' || this.progressPercent === 100;
  }

  isAtRisk(): boolean {
    return this.status === 'AT_RISK';
  }

  isOnTrack(): boolean {
    return this.status === 'ON_TRACK';
  }

  toSummary(): { title: string; category: GoalCategory; progressPercent: number; status: GoalStatus } {
    return {
      title: this.title,
      category: this.category,
      progressPercent: this.progressPercent,
      status: this.status,
    };
  }
}
