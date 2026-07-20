import { ClinicalEvent } from '../entities/clinical-event.entity.js';
import { BiomarkerTrend } from '../entities/biomarker-trend.entity.js';
import { TimelineAnalyticsComputer } from '../analytics/timeline-analytics.js';
import { TimelineQuery } from '../timelines/timeline-query.js';
import { HealthTimeline } from '../entities/health-timeline.entity.js';
import type { TimelineAnalytics } from '../entities/health-timeline.entity.js';

const makeEvent = (
  eventType: ClinicalEvent['eventType'],
  date: string,
  severity: ClinicalEvent['severity'] = 'INFORMATIONAL',
): ClinicalEvent =>
  new ClinicalEvent({ patientId: 'p1', eventType, date: new Date(date), severity });

const makeTrend = (
  marker: string,
  classification: BiomarkerTrend['classification'],
): BiomarkerTrend =>
  new BiomarkerTrend({
    marker,
    firstValue: 7.5,
    lastValue: 6.5,
    minValue: 6.5,
    maxValue: 7.5,
    variation: -1,
    variationPercent: -13,
    direction: 'DOWN',
    classification,
    confidence: 0.8,
    dataPoints: [],
    explanation: {
      eventsConsidered: 3,
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-06-01'),
      influencingFactors: [],
      confidence: 0.8,
      reasoning: 'test',
    },
    normalRange: { low: 4, high: 5.6 },
  });

const defaultAnalytics = (): TimelineAnalytics => ({
  totalEvents: 0,
  eventsByType: {},
  progressionVelocity: 0,
  meanDaysBetweenEvents: 0,
  estimatedAdherence: 1,
  clinicalStability: 1,
  metabolicTrend: 'UNKNOWN',
  cardiovascularTrend: 'UNKNOWN',
  longestGapDays: 0,
  mostFrequentEventType: 'NONE',
});

describe('TimelineAnalyticsComputer', () => {
  const computer = new TimelineAnalyticsComputer();

  it('returns zeros for empty events', () => {
    const a = computer.compute([], [], 30);
    expect(a.totalEvents).toBe(0);
    expect(a.progressionVelocity).toBe(0);
    expect(a.meanDaysBetweenEvents).toBe(0);
  });

  it('counts total events correctly', () => {
    const events = [
      makeEvent('LAB_RESULT', '2024-01-01'),
      makeEvent('CONSULTATION', '2024-02-01'),
      makeEvent('DIAGNOSIS', '2024-03-01'),
    ];
    const a = computer.compute(events, [], 90);
    expect(a.totalEvents).toBe(3);
    expect(a.eventsByType['LAB_RESULT']).toBe(1);
    expect(a.eventsByType['CONSULTATION']).toBe(1);
  });

  it('progressionVelocity = events per month', () => {
    const events = [
      makeEvent('LAB_RESULT', '2024-01-01'),
      makeEvent('LAB_RESULT', '2024-02-01'),
      makeEvent('LAB_RESULT', '2024-03-01'),
    ];
    const a = computer.compute(events, [], 60); // 2 months
    expect(a.progressionVelocity).toBe(1.5); // 3 events / 2 months
  });

  it('meanDaysBetweenEvents', () => {
    const events = [
      makeEvent('LAB_RESULT', '2024-01-01'),
      makeEvent('LAB_RESULT', '2024-01-31'),
      makeEvent('LAB_RESULT', '2024-03-01'),
    ];
    const a = computer.compute(events, [], 60);
    expect(a.meanDaysBetweenEvents).toBeGreaterThan(0);
  });

  it('metabolicTrend derived from metabolic markers only', () => {
    const metabolicTrend = makeTrend('hba1c', 'IMPROVING');
    const cardioTrend = makeTrend('ldl', 'WORSENING');
    const a = computer.compute([], [metabolicTrend, cardioTrend], 30);
    expect(a.metabolicTrend).toBe('IMPROVING');
    expect(a.cardiovascularTrend).toBe('WORSENING');
  });

  it('mixed metabolic trends', () => {
    const trends = [makeTrend('hba1c', 'IMPROVING'), makeTrend('crp', 'WORSENING')];
    const a = computer.compute([], trends, 30);
    expect(a.metabolicTrend).toBe('MIXED');
  });

  it('clinicalStability is 1 for all informational events', () => {
    const events = [makeEvent('CONSULTATION', '2024-01-01'), makeEvent('LAB_RESULT', '2024-02-01')];
    const a = computer.compute(events, [], 30);
    expect(a.clinicalStability).toBe(1);
  });

  it('clinicalStability decreases with critical events', () => {
    const events = [
      makeEvent('HOSPITALIZATION', '2024-01-01', 'CRITICAL'),
      makeEvent('CONSULTATION', '2024-02-01', 'INFORMATIONAL'),
    ];
    const a = computer.compute(events, [], 30);
    expect(a.clinicalStability).toBeLessThan(1);
  });

  it('longestGapDays', () => {
    const events = [
      makeEvent('LAB_RESULT', '2024-01-01'),
      makeEvent('LAB_RESULT', '2024-04-01'),
    ];
    const a = computer.compute(events, [], 91);
    expect(a.longestGapDays).toBeGreaterThan(80);
  });

  it('mostFrequentEventType', () => {
    const events = [
      makeEvent('LAB_RESULT', '2024-01-01'),
      makeEvent('LAB_RESULT', '2024-02-01'),
      makeEvent('CONSULTATION', '2024-03-01'),
    ];
    const a = computer.compute(events, [], 90);
    expect(a.mostFrequentEventType).toBe('LAB_RESULT');
  });
});

describe('TimelineQuery', () => {
  const events = [
    new ClinicalEvent({ patientId: 'p1', eventType: 'LAB_RESULT', date: new Date('2024-01-15'), severity: 'CRITICAL' }),
    new ClinicalEvent({ patientId: 'p1', eventType: 'CONSULTATION', date: new Date('2024-03-10'), severity: 'MILD' }),
    new ClinicalEvent({ patientId: 'p1', eventType: 'DIAGNOSIS', date: new Date('2024-05-20'), severity: 'SEVERE' }),
    new ClinicalEvent({ patientId: 'p1', eventType: 'MEDICATION', date: new Date('2024-07-01'), severity: 'INFORMATIONAL' }),
  ];

  it('filterEvents by eventTypes', () => {
    const result = TimelineQuery.filterEvents(events, { eventTypes: ['LAB_RESULT', 'DIAGNOSIS'] });
    expect(result).toHaveLength(2);
  });

  it('filterEvents by minSeverity', () => {
    const result = TimelineQuery.filterEvents(events, { minSeverity: 'SEVERE' });
    expect(result).toHaveLength(2); // CRITICAL + SEVERE
  });

  it('filterEvents by date range', () => {
    const result = TimelineQuery.filterEvents(events, {
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-06-01'),
    });
    expect(result).toHaveLength(2);
  });

  it('filterEvents with limit', () => {
    const result = TimelineQuery.filterEvents(events, { limit: 2 });
    expect(result).toHaveLength(2);
  });

  it('getMostCriticalPeriod returns null when no critical/severe', () => {
    const mildEvents = [makeEvent('CONSULTATION', '2024-01-01')];
    expect(TimelineQuery.getMostCriticalPeriod(mildEvents)).toBeNull();
  });

  it('getMostCriticalPeriod returns range for critical events', () => {
    const period = TimelineQuery.getMostCriticalPeriod(events);
    expect(period).not.toBeNull();
    expect(period!.start).toBeInstanceOf(Date);
    expect(period!.end).toBeInstanceOf(Date);
  });

  it('summarize returns correct shape', () => {
    const timeline = new HealthTimeline({
      patientId: 'p1',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      events,
      analytics: defaultAnalytics(),
    });
    const summary = TimelineQuery.summarize(timeline);
    expect(summary.patientId).toBe('p1');
    expect(summary.totalEvents).toBe(4);
    expect(summary.significantEvents).toBeGreaterThan(0);
    expect(summary.period.days).toBeGreaterThan(0);
  });
});
