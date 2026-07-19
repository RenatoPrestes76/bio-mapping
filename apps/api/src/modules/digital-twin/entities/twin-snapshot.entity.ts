export interface TwinSnapshotData {
  id?: string;
  twinId: string;
  timestamp?: Date;
  clinicalIndicators: Record<string, string | number>;
  biomarkers: Record<string, number>;
  riskScores: Record<string, number>;
  lifestyleMetrics: Record<string, unknown>;
}

export class TwinSnapshot {
  readonly id: string;
  readonly twinId: string;
  readonly timestamp: Date;
  readonly clinicalIndicators: Record<string, string | number>;
  readonly biomarkers: Record<string, number>;
  readonly riskScores: Record<string, number>;
  readonly lifestyleMetrics: Record<string, unknown>;

  constructor(data: TwinSnapshotData) {
    this.id = data.id ?? `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.twinId = data.twinId;
    this.timestamp = data.timestamp ?? new Date();
    this.clinicalIndicators = data.clinicalIndicators;
    this.biomarkers = data.biomarkers;
    this.riskScores = data.riskScores;
    this.lifestyleMetrics = data.lifestyleMetrics;
  }

  getBiomarkerValue(name: string): number | undefined {
    const q = name.toLowerCase();
    for (const [key, value] of Object.entries(this.biomarkers)) {
      if (key.toLowerCase() === q) return value;
    }
    return undefined;
  }

  getRiskScore(riskType: string): number | undefined {
    const q = riskType.toLowerCase();
    for (const [key, value] of Object.entries(this.riskScores)) {
      if (key.toLowerCase() === q) return value;
    }
    return undefined;
  }
}
