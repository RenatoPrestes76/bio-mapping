import { DigitalTwin, TimelineEntry } from '../entities/digital-twin.entity.js';
import { TwinSnapshot } from '../entities/twin-snapshot.entity.js';

export interface BiomarkerDelta {
  from: number;
  to: number;
  delta: number;
  percentChange: number;
}

export interface SnapshotComparison {
  snapshot1Id: string;
  snapshot2Id: string;
  timeDeltaMs: number;
  biomarkerDeltas: Record<string, BiomarkerDelta>;
  riskScoreDeltas: Record<string, { from: number; to: number; delta: number }>;
  improving: string[];
  worsening: string[];
  stable: string[];
}

const LOWER_BETTER_BIOMARKERS = new Set([
  'fasting_glucose', 'glicemia', 'glucose',
  'hba1c',
  'systolic_bp', 'pas',
  'diastolic_bp', 'pad',
  'ldl',
  'triglycerides', 'triglicerideos',
  'crp', 'pcr',
  'bmi', 'imc',
  'tsh',
  'uric_acid', 'acido_urico',
  'homocysteine', 'homocisteina',
  'insulin', 'insulina',
]);

export class TimelineEngine {
  getSortedTimeline(twin: DigitalTwin): TimelineEntry[] {
    return [...twin.timeline].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  getSnapshotEntries(twin: DigitalTwin): TimelineEntry[] {
    return this.getSortedTimeline(twin).filter(
      (e) => e.type === 'SNAPSHOT' && e.snapshotId,
    );
  }

  compareSnapshots(s1: TwinSnapshot, s2: TwinSnapshot): SnapshotComparison {
    const biomarkerDeltas: Record<string, BiomarkerDelta> = {};
    const improving: string[] = [];
    const worsening: string[] = [];
    const stable: string[] = [];

    const allBiomarkers = new Set([
      ...Object.keys(s1.biomarkers),
      ...Object.keys(s2.biomarkers),
    ]);

    for (const key of allBiomarkers) {
      const from = s1.biomarkers[key] ?? 0;
      const to = s2.biomarkers[key] ?? 0;
      const delta = to - from;
      const percentChange = from !== 0 ? (delta / from) * 100 : 0;
      biomarkerDeltas[key] = {
        from,
        to,
        delta: Math.round(delta * 100) / 100,
        percentChange: Math.round(percentChange * 10) / 10,
      };

      const lowerBetter = LOWER_BETTER_BIOMARKERS.has(key.toLowerCase());
      if (Math.abs(percentChange) < 2) {
        stable.push(key);
      } else if ((lowerBetter && delta < 0) || (!lowerBetter && delta > 0)) {
        improving.push(key);
      } else {
        worsening.push(key);
      }
    }

    const riskScoreDeltas: Record<string, { from: number; to: number; delta: number }> = {};
    const allRisks = new Set([
      ...Object.keys(s1.riskScores),
      ...Object.keys(s2.riskScores),
    ]);
    for (const key of allRisks) {
      const from = s1.riskScores[key] ?? 0;
      const to = s2.riskScores[key] ?? 0;
      riskScoreDeltas[key] = { from, to, delta: Math.round((to - from) * 100) / 100 };
    }

    return {
      snapshot1Id: s1.id,
      snapshot2Id: s2.id,
      timeDeltaMs: s2.timestamp.getTime() - s1.timestamp.getTime(),
      biomarkerDeltas,
      riskScoreDeltas,
      improving,
      worsening,
      stable,
    };
  }

  buildEntry(
    event: string,
    type: TimelineEntry['type'],
    snapshotId?: string,
    metadata?: Record<string, unknown>,
  ): TimelineEntry {
    return {
      id: `entry-${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      snapshotId,
      timestamp: new Date(),
      event,
      type,
      metadata,
    };
  }
}
