export type RecommendationPriority = 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM';
export type RecommendationArea =
  | 'MONITORING'
  | 'LIFESTYLE'
  | 'ADHERENCE'
  | 'FOLLOW_UP'
  | 'NUTRITION'
  | 'ACTIVITY'
  | 'STRESS'
  | 'SLEEP'
  | 'LONGEVITY';

export class AdaptiveRecommendation {
  readonly id: string;
  readonly patientId: string;
  readonly area: RecommendationArea;
  readonly priority: RecommendationPriority;
  readonly title: string;
  readonly rationale: string;
  readonly actions: string[];
  readonly evidenceBasis: string[];
  readonly isClinicianReviewRequired: boolean;

  constructor(params: {
    id?: string;
    patientId: string;
    area: RecommendationArea;
    priority: RecommendationPriority;
    title: string;
    rationale: string;
    actions?: string[];
    evidenceBasis?: string[];
    isClinicianReviewRequired?: boolean;
  }) {
    this.id = params.id ?? `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.patientId = params.patientId;
    this.area = params.area;
    this.priority = params.priority;
    this.title = params.title;
    this.rationale = params.rationale;
    this.actions = params.actions ?? [];
    this.evidenceBasis = params.evidenceBasis ?? [];
    this.isClinicianReviewRequired = params.isClinicianReviewRequired ?? false;
  }

  isUrgent(): boolean {
    return this.priority === 'IMMEDIATE';
  }

  isLongTerm(): boolean {
    return this.priority === 'LONG_TERM';
  }

  toSummary(): {
    id: string;
    area: RecommendationArea;
    priority: RecommendationPriority;
    title: string;
    isClinicianReviewRequired: boolean;
  } {
    return {
      id: this.id,
      area: this.area,
      priority: this.priority,
      title: this.title,
      isClinicianReviewRequired: this.isClinicianReviewRequired,
    };
  }
}
