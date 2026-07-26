export type NarrativeEventType =
  | 'LAB_RESULT'
  | 'DIAGNOSIS'
  | 'MEDICATION_START'
  | 'MEDICATION_CHANGE'
  | 'CONSULTATION'
  | 'PROCEDURE'
  | 'HOSPITALIZATION'
  | 'GENOMIC_DISCOVERY'
  | 'LIFESTYLE_CHANGE'
  | 'MILESTONE'
  | 'CLINICAL_RECOMMENDATION'
  | 'THERAPEUTIC_CHANGE';

export type NarrativeSignificance = 'LOW' | 'MEDIUM' | 'HIGH' | 'LANDMARK';

export class NarrativeEvent {
  readonly id: string;
  readonly patientId: string;
  readonly eventType: NarrativeEventType;
  readonly date: Date;
  readonly narrativeText: string;
  readonly significance: NarrativeSignificance;
  readonly chapterNumber: number;
  readonly sourceEventId?: string;
  readonly metadata: Record<string, unknown>;

  constructor(params: {
    id?: string;
    patientId: string;
    eventType: NarrativeEventType;
    date: Date | string;
    narrativeText: string;
    significance?: NarrativeSignificance;
    chapterNumber?: number;
    sourceEventId?: string;
    metadata?: Record<string, unknown>;
  }) {
    this.id = params.id ?? `ne-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.patientId = params.patientId;
    this.eventType = params.eventType;
    this.date = params.date instanceof Date ? params.date : new Date(params.date);
    this.narrativeText = params.narrativeText;
    this.significance = params.significance ?? 'LOW';
    this.chapterNumber = params.chapterNumber ?? 1;
    this.sourceEventId = params.sourceEventId;
    this.metadata = params.metadata ?? {};
  }

  isLandmark(): boolean {
    return this.significance === 'LANDMARK';
  }

  isSignificant(): boolean {
    return this.significance === 'HIGH' || this.significance === 'LANDMARK';
  }

  daysSince(reference: Date): number {
    return Math.floor((reference.getTime() - this.date.getTime()) / 86_400_000);
  }
}
