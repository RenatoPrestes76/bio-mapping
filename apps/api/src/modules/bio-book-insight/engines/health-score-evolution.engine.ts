import { HealthScorePoint } from '../entities/health-score-point.entity.js';
import type { ScoreTrend } from '../entities/health-score-point.entity.js';
import type { NarrativeEvent } from '../../bio-book/entities/narrative-event.entity.js';
import type { HealthMilestone } from '../../bio-book/entities/health-milestone.entity.js';

const MONTH_LABELS_PT: string[] = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface MonthBucket {
  key: string;
  year: number;
  month: number;
  events: NarrativeEvent[];
  milestones: HealthMilestone[];
}

export class HealthScoreEvolutionEngine {
  compute(events: NarrativeEvent[], milestones: HealthMilestone[]): HealthScorePoint[] {
    if (!events.length) return [];

    const buckets = this.buildMonthBuckets(events, milestones);
    const rawScores = buckets.map((b) => this.scoreMonth(b));
    return this.attachTrends(rawScores, buckets);
  }

  private buildMonthBuckets(events: NarrativeEvent[], milestones: HealthMilestone[]): MonthBucket[] {
    const byKey = new Map<string, MonthBucket>();

    for (const e of events) {
      const year = e.date.getUTCFullYear();
      const month = e.date.getUTCMonth();
      const key = `${year}-${String(month).padStart(2, '0')}`;
      if (!byKey.has(key)) {
        byKey.set(key, { key, year, month, events: [], milestones: [] });
      }
      byKey.get(key)!.events.push(e);
    }

    for (const m of milestones) {
      const year = m.achievedAt.getUTCFullYear();
      const month = m.achievedAt.getUTCMonth();
      const key = `${year}-${String(month).padStart(2, '0')}`;
      const bucket = byKey.get(key);
      if (bucket) bucket.milestones.push(m);
    }

    return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
  }

  private scoreMonth(bucket: MonthBucket): {
    year: number;
    month: number;
    score: number;
    adherence: number;
    biomarker: number;
    lifestyle: number;
  } {
    const { events, milestones } = bucket;

    const consultations = events.filter((e) => e.eventType === 'CONSULTATION').length;
    const labs = events.filter((e) => e.eventType === 'LAB_RESULT').length;
    const adherence = Math.min(100, (consultations + labs) * 20);

    const biomarkerMs = milestones.filter((m) => m.milestoneType === 'BIOMARKER_IMPROVEMENT').length;
    const significantLabs = events.filter((e) => e.eventType === 'LAB_RESULT' && e.isSignificant()).length;
    const biomarker = Math.min(100, biomarkerMs * 30 + significantLabs * 15);

    const meds = events.filter(
      (e) => e.eventType === 'MEDICATION_START' || e.eventType === 'THERAPEUTIC_CHANGE' || e.eventType === 'CLINICAL_RECOMMENDATION',
    ).length;
    const consistencyMs = milestones.filter((m) => m.milestoneType === 'HABIT_CONSISTENCY').length;
    const lifestyle = Math.min(100, meds * 20 + consistencyMs * 25);

    const score = Math.round(40 + adherence * 0.3 + biomarker * 0.4 + lifestyle * 0.3);
    return { year: bucket.year, month: bucket.month, score: Math.min(100, Math.max(0, score)), adherence, biomarker, lifestyle };
  }

  private attachTrends(
    rawScores: Array<{ year: number; month: number; score: number; adherence: number; biomarker: number; lifestyle: number }>,
    buckets: MonthBucket[],
  ): HealthScorePoint[] {
    return rawScores.map((raw, idx) => {
      const date = new Date(Date.UTC(raw.year, raw.month, 1));
      const label = `${MONTH_LABELS_PT[raw.month]} ${raw.year}`;
      let trend: ScoreTrend = 'STABLE';
      let delta: number | undefined;

      if (idx > 0) {
        const prev = rawScores[idx - 1].score;
        delta = raw.score - prev;
        if (delta > 2) trend = 'UP';
        else if (delta < -2) trend = 'DOWN';
      }

      return new HealthScorePoint({
        date,
        label,
        score: raw.score,
        breakdown: { adherence: raw.adherence, biomarker: raw.biomarker, lifestyle: raw.lifestyle },
        trend,
        delta,
      });
    });
  }
}
