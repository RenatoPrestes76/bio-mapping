export type RiskLevel = 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';

export interface ClinicalState {
  conditions: string[];
  biomarkers: Record<string, number>;
  medications: string[];
  symptoms: string[];
  lastUpdated: Date;
}

export interface RiskState {
  cardiovascularRisk: RiskLevel;
  metabolicRisk: RiskLevel;
  diabetesRisk: RiskLevel;
  overallRisk: RiskLevel;
  riskScore: number;
  lastUpdated: Date;
}

export interface TimelineEntry {
  id: string;
  snapshotId?: string;
  timestamp: Date;
  event: string;
  type: 'CLINICAL' | 'INTERVENTION' | 'SIMULATION' | 'FORECAST' | 'SNAPSHOT';
  metadata?: Record<string, unknown>;
}

export interface DigitalTwinData {
  id?: string;
  patientId: string;
  profileSnapshot: Record<string, unknown>;
  clinicalState: ClinicalState;
  riskState: RiskState;
  timeline?: TimelineEntry[];
  version?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class DigitalTwin {
  readonly id: string;
  readonly patientId: string;
  readonly profileSnapshot: Record<string, unknown>;
  readonly clinicalState: ClinicalState;
  readonly riskState: RiskState;
  readonly timeline: TimelineEntry[];
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: DigitalTwinData) {
    this.id = data.id ?? `twin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.patientId = data.patientId;
    this.profileSnapshot = data.profileSnapshot;
    this.clinicalState = data.clinicalState;
    this.riskState = data.riskState;
    this.timeline = data.timeline ?? [];
    this.version = data.version ?? 1;
    this.createdAt = data.createdAt ?? new Date();
    this.updatedAt = data.updatedAt ?? new Date();
  }

  addTimelineEntry(entry: TimelineEntry): DigitalTwin {
    return new DigitalTwin({
      id: this.id,
      patientId: this.patientId,
      profileSnapshot: this.profileSnapshot,
      clinicalState: this.clinicalState,
      riskState: this.riskState,
      timeline: [...this.timeline, entry],
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  withUpdatedState(
    clinicalState: Partial<ClinicalState>,
    riskState?: Partial<RiskState>,
  ): DigitalTwin {
    return new DigitalTwin({
      id: this.id,
      patientId: this.patientId,
      profileSnapshot: this.profileSnapshot,
      clinicalState: { ...this.clinicalState, ...clinicalState, lastUpdated: new Date() },
      riskState: riskState
        ? { ...this.riskState, ...riskState, lastUpdated: new Date() }
        : this.riskState,
      timeline: this.timeline,
      version: this.version + 1,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  isOutdated(maxAgeHours: number): boolean {
    const ageMs = Date.now() - this.updatedAt.getTime();
    return ageMs > maxAgeHours * 3_600_000;
  }

  getBiomarker(name: string): number | undefined {
    const q = name.toLowerCase();
    for (const [key, value] of Object.entries(this.clinicalState.biomarkers)) {
      if (key.toLowerCase() === q) return value;
    }
    return undefined;
  }

  hasCondition(condition: string): boolean {
    const q = condition.toLowerCase();
    return this.clinicalState.conditions.some((c) => c.toLowerCase().includes(q));
  }
}
