export type PredictionConfidence = 'LOW' | 'MODERATE' | 'HIGH';
export type PredictionCategory =
  | 'GOAL_ACHIEVEMENT'
  | 'SCORE_LEVEL'
  | 'HABIT_MILESTONE'
  | 'ROUTINE_FOLLOW_UP'
  | 'BIOMARKER_TARGET';

export class MilestonePrediction {
  readonly id: string;
  readonly patientId: string;
  readonly title: string;
  readonly description: string;
  readonly category: PredictionCategory;
  readonly estimatedTimeframe: string;
  readonly confidence: PredictionConfidence;
  readonly requiredActions: string[];
  readonly basisDescription: string;

  constructor(params: {
    id?: string;
    patientId: string;
    title: string;
    description: string;
    category: PredictionCategory;
    estimatedTimeframe: string;
    confidence?: PredictionConfidence;
    requiredActions?: string[];
    basisDescription?: string;
  }) {
    this.id = params.id ?? `pred-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.patientId = params.patientId;
    this.title = params.title;
    this.description = params.description;
    this.category = params.category;
    this.estimatedTimeframe = params.estimatedTimeframe;
    this.confidence = params.confidence ?? 'MODERATE';
    this.requiredActions = params.requiredActions ?? [];
    this.basisDescription = params.basisDescription ?? '';
  }

  isHighConfidence(): boolean {
    return this.confidence === 'HIGH';
  }

  isRoutine(): boolean {
    return this.category === 'ROUTINE_FOLLOW_UP';
  }

  toSummary(): {
    title: string;
    category: PredictionCategory;
    estimatedTimeframe: string;
    confidence: PredictionConfidence;
  } {
    return {
      title: this.title,
      category: this.category,
      estimatedTimeframe: this.estimatedTimeframe,
      confidence: this.confidence,
    };
  }
}
