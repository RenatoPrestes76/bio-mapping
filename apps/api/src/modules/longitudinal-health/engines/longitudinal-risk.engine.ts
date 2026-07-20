import type { ClinicalEvent } from '../entities/clinical-event.entity.js';
import type { BiomarkerTrend } from '../entities/biomarker-trend.entity.js';
import type { RiskEvolutionPoint } from '../entities/health-timeline.entity.js';
import type { DiseaseProgression } from '../entities/health-timeline.entity.js';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

interface RiskInput {
  events: ClinicalEvent[];
  trends: BiomarkerTrend[];
  progressions: DiseaseProgression[];
  asOf: Date;
}

function scoreToLevel(score: number): RiskLevel {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MODERATE';
  return 'LOW';
}

function trendScore(trends: BiomarkerTrend[]): number {
  if (trends.length === 0) return 0;
  let score = 0;
  for (const t of trends) {
    if (t.classification === 'WORSENING') score += 10;
    else if (t.classification === 'OSCILLATING') score += 5;
    else if (t.classification === 'IMPROVING') score -= 3;
    if (!t.isWithinNormalRange()) score += 8;
  }
  return Math.max(0, Math.min(40, score));
}

function progressionScore(progressions: DiseaseProgression[]): number {
  let score = 0;
  for (const p of progressions) {
    if (p.trend === 'WORSENING') score += 15;
    else if (p.trend === 'STABLE') score += 5;
    else if (p.trend === 'IMPROVING') score -= 3;
  }
  return Math.max(0, Math.min(30, score));
}

function eventScore(events: ClinicalEvent[], asOf: Date): number {
  let score = 0;
  const recentDays = 90;
  const cutoff = new Date(asOf.getTime() - recentDays * 86_400_000);
  const recent = events.filter((e) => e.date >= cutoff);

  for (const e of recent) {
    if (e.severity === 'CRITICAL') score += 20;
    else if (e.severity === 'SEVERE') score += 12;
    else if (e.severity === 'MODERATE') score += 6;
    if (e.eventType === 'HOSPITALIZATION') score += 15;
  }
  return Math.max(0, Math.min(30, score));
}

function buildContributingFactors(
  input: RiskInput,
  trendSc: number,
  progSc: number,
  eventSc: number,
): string[] {
  const factors: string[] = [];
  if (trendSc >= 20) factors.push('Multiple biomarkers worsening or out of range');
  if (progSc >= 15) factors.push('Disease progression detected in one or more conditions');
  if (eventSc >= 15) factors.push('Recent severe or critical clinical events');

  for (const t of input.trends) {
    if (t.classification === 'WORSENING') factors.push(`${t.marker} trending worse`);
  }

  for (const p of input.progressions) {
    if (p.trend === 'WORSENING') factors.push(`${p.condition} progressing to ${p.currentStage}`);
  }

  const recentHosp = input.events.filter(
    (e) => e.eventType === 'HOSPITALIZATION' && e.daysSince(input.asOf) <= 90,
  );
  if (recentHosp.length > 0) factors.push(`${recentHosp.length} hospitalization(s) in past 90 days`);

  return factors;
}

export class LongitudinalRiskEngine {
  computeRisk(input: RiskInput): RiskEvolutionPoint {
    const trendSc = trendScore(input.trends);
    const progSc = progressionScore(input.progressions);
    const eventSc = eventScore(input.events, input.asOf);
    const riskScore = Math.min(100, trendSc + progSc + eventSc);

    return {
      date: input.asOf,
      riskScore,
      riskLevel: scoreToLevel(riskScore),
      contributingFactors: buildContributingFactors(input, trendSc, progSc, eventSc),
    };
  }

  buildRiskEvolution(
    allEvents: ClinicalEvent[],
    trends: BiomarkerTrend[],
    progressions: DiseaseProgression[],
    intervalDays = 30,
  ): RiskEvolutionPoint[] {
    if (allEvents.length === 0) return [];

    const sorted = [...allEvents].sort((a, b) => a.date.getTime() - b.date.getTime());
    const start = sorted[0].date;
    const end = sorted[sorted.length - 1].date;

    const points: RiskEvolutionPoint[] = [];
    let current = new Date(start);

    while (current <= end) {
      const snapshot = allEvents.filter((e) => e.date <= current);
      points.push(
        this.computeRisk({ events: snapshot, trends, progressions, asOf: new Date(current) }),
      );
      current = new Date(current.getTime() + intervalDays * 86_400_000);
    }

    // always include a final point at end date
    const lastPoint = points[points.length - 1];
    if (!lastPoint || lastPoint.date.getTime() < end.getTime()) {
      points.push(this.computeRisk({ events: allEvents, trends, progressions, asOf: end }));
    }

    return points;
  }
}
