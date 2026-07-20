import type { ClinicalEvent, ClinicalEventType, EventSeverity } from '../entities/clinical-event.entity.js';
import type { HealthTimeline } from '../entities/health-timeline.entity.js';

export interface TimelineQueryOptions {
  eventTypes?: ClinicalEventType[];
  minSeverity?: EventSeverity;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

const SEVERITY_ORDER: Record<EventSeverity, number> = {
  INFORMATIONAL: 0,
  MILD: 1,
  MODERATE: 2,
  SEVERE: 3,
  CRITICAL: 4,
};

export class TimelineQuery {
  static filterEvents(events: ClinicalEvent[], options: TimelineQueryOptions): ClinicalEvent[] {
    let result = [...events];

    if (options.eventTypes && options.eventTypes.length > 0) {
      const set = new Set(options.eventTypes);
      result = result.filter((e) => set.has(e.eventType));
    }

    if (options.minSeverity) {
      const minLevel = SEVERITY_ORDER[options.minSeverity];
      result = result.filter((e) => SEVERITY_ORDER[e.severity] >= minLevel);
    }

    if (options.startDate) {
      result = result.filter((e) => e.date >= options.startDate!);
    }

    if (options.endDate) {
      result = result.filter((e) => e.date <= options.endDate!);
    }

    if (options.offset) result = result.slice(options.offset);
    if (options.limit) result = result.slice(0, options.limit);

    return result;
  }

  static summarize(timeline: HealthTimeline): {
    patientId: string;
    period: { start: Date; end: Date; days: number };
    totalEvents: number;
    significantEvents: number;
    biomarkersTracked: number;
    conditionsTracked: number;
    currentRiskLevel: string;
    metabolicTrend: string;
    cardiovascularTrend: string;
  } {
    return {
      patientId: timeline.patientId,
      period: {
        start: timeline.startDate,
        end: timeline.endDate,
        days: timeline.spanDays(),
      },
      totalEvents: timeline.events.length,
      significantEvents: timeline.getSignificantEvents().length,
      biomarkersTracked: timeline.biomarkerTrends.length,
      conditionsTracked: timeline.diseaseProgressions.length,
      currentRiskLevel: timeline.getLatestRiskScore()?.riskLevel ?? 'UNKNOWN',
      metabolicTrend: timeline.analytics.metabolicTrend,
      cardiovascularTrend: timeline.analytics.cardiovascularTrend,
    };
  }

  static getMostCriticalPeriod(events: ClinicalEvent[]): { start: Date; end: Date } | null {
    const critical = events.filter((e) => e.severity === 'CRITICAL' || e.severity === 'SEVERE');
    if (critical.length === 0) return null;
    const sorted = [...critical].sort((a, b) => a.date.getTime() - b.date.getTime());
    return { start: sorted[0].date, end: sorted[sorted.length - 1].date };
  }
}
