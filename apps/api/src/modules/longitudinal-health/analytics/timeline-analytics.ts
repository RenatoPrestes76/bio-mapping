import type { ClinicalEvent } from '../entities/clinical-event.entity.js';
import type { BiomarkerTrend } from '../entities/biomarker-trend.entity.js';
import type { TimelineAnalytics } from '../entities/health-timeline.entity.js';

const METABOLIC_MARKERS = new Set(['hba1c', 'glucose', 'creatinine', 'egfr', 'crp', 'pcr']);
const CARDIOVASCULAR_MARKERS = new Set(['ldl', 'hdl', 'triglycerides', 'bp_systolic', 'bp_diastolic']);

type TrendCategory = 'IMPROVING' | 'STABLE' | 'WORSENING' | 'MIXED' | 'UNKNOWN';

function categorizeTrends(trends: BiomarkerTrend[]): TrendCategory {
  if (trends.length === 0) return 'UNKNOWN';
  const improving = trends.filter((t) => t.isImproving()).length;
  const worsening = trends.filter((t) => t.isWorsening()).length;
  if (improving === trends.length) return 'IMPROVING';
  if (worsening === trends.length) return 'WORSENING';
  if (improving === 0 && worsening === 0) return 'STABLE';
  return 'MIXED';
}

function computeProgressionVelocity(events: ClinicalEvent[], spanDays: number): number {
  if (spanDays <= 0 || events.length === 0) return 0;
  const months = spanDays / 30;
  return Math.round((events.length / months) * 10) / 10;
}

function computeMeanDaysBetweenEvents(events: ClinicalEvent[]): number {
  if (events.length < 2) return 0;
  const sorted = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
  let totalGap = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalGap += (sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / 86_400_000;
  }
  return Math.round((totalGap / (sorted.length - 1)) * 10) / 10;
}

function computeLongestGap(events: ClinicalEvent[]): number {
  if (events.length < 2) return 0;
  const sorted = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
  let max = 0;
  for (let i = 1; i < sorted.length; i++) {
    const gap = (sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / 86_400_000;
    if (gap > max) max = gap;
  }
  return Math.round(max);
}

function computeAdherence(events: ClinicalEvent[]): number {
  const medicationEvents = events.filter((e) => e.eventType === 'MEDICATION');
  if (medicationEvents.length === 0) return 1;

  const therapeuticChanges = events.filter((e) => e.eventType === 'THERAPEUTIC_CHANGE');
  const irregularities = therapeuticChanges.filter(
    (e) => e.metadata.description?.toLowerCase().includes('non-adherence') ||
            e.metadata.description?.toLowerCase().includes('missed'),
  ).length;

  const adherenceScore = Math.max(0, 1 - irregularities / Math.max(1, medicationEvents.length));
  return Math.round(adherenceScore * 100) / 100;
}

function computeClinicalStability(events: ClinicalEvent[]): number {
  if (events.length === 0) return 1;
  const critical = events.filter((e) => e.severity === 'CRITICAL').length;
  const severe = events.filter((e) => e.severity === 'SEVERE').length;
  const total = events.length;
  const instabilityScore = (critical * 3 + severe * 1.5) / (total * 3);
  return Math.round(Math.max(0, 1 - instabilityScore) * 100) / 100;
}

function mostFrequentType(events: ClinicalEvent[]): string {
  if (events.length === 0) return 'NONE';
  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.eventType] = (counts[e.eventType] ?? 0) + 1;
  }
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0];
}

export class TimelineAnalyticsComputer {
  compute(events: ClinicalEvent[], trends: BiomarkerTrend[], spanDays: number): TimelineAnalytics {
    const eventsByType: Record<string, number> = {};
    for (const e of events) {
      eventsByType[e.eventType] = (eventsByType[e.eventType] ?? 0) + 1;
    }

    const metabolicTrends = trends.filter((t) => METABOLIC_MARKERS.has(t.marker.toLowerCase()));
    const cardiovascularTrends = trends.filter((t) =>
      CARDIOVASCULAR_MARKERS.has(t.marker.toLowerCase()),
    );

    return {
      totalEvents: events.length,
      eventsByType,
      progressionVelocity: computeProgressionVelocity(events, spanDays),
      meanDaysBetweenEvents: computeMeanDaysBetweenEvents(events),
      estimatedAdherence: computeAdherence(events),
      clinicalStability: computeClinicalStability(events),
      metabolicTrend: categorizeTrends(metabolicTrends),
      cardiovascularTrend: categorizeTrends(cardiovascularTrends),
      longestGapDays: computeLongestGap(events),
      mostFrequentEventType: mostFrequentType(events),
    };
  }
}
