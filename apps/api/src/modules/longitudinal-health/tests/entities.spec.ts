import { ClinicalEvent } from '../entities/clinical-event.entity.js';
import { BiomarkerTrend } from '../entities/biomarker-trend.entity.js';
import { HealthTimeline } from '../entities/health-timeline.entity.js';
import type { TimelineAnalytics } from '../entities/health-timeline.entity.js';

const makeAnalytics = (): TimelineAnalytics => ({
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

const makeTrend = (marker: string, classification: BiomarkerTrend['classification']): BiomarkerTrend =>
  new BiomarkerTrend({
    marker,
    firstValue: 7.5,
    lastValue: classification === 'IMPROVING' ? 6.5 : 8.5,
    minValue: 6.5,
    maxValue: 8.5,
    variation: classification === 'IMPROVING' ? -1 : 1,
    variationPercent: 13,
    direction: classification === 'IMPROVING' ? 'DOWN' : 'UP',
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

describe('ClinicalEvent', () => {
  const baseEvent = () =>
    new ClinicalEvent({
      patientId: 'p1',
      eventType: 'LAB_RESULT',
      date: new Date('2024-03-15'),
      severity: 'MODERATE',
      metadata: {
        biomarkers: [
          { marker: 'HbA1c', value: 7.2, unit: '%' },
          { marker: 'Glucose', value: 130, unit: 'mg/dL' },
        ],
      },
    });

  it('generates a unique id', () => {
    const e1 = baseEvent();
    const e2 = baseEvent();
    expect(e1.id).toMatch(/^evt-/);
    expect(e1.id).not.toBe(e2.id);
  });

  it('defaults source to EHR and severity to INFORMATIONAL', () => {
    const e = new ClinicalEvent({ patientId: 'p1', eventType: 'CONSULTATION', date: new Date() });
    expect(e.source).toBe('EHR');
    expect(e.severity).toBe('INFORMATIONAL');
  });

  it('accepts date as string', () => {
    const e = new ClinicalEvent({ patientId: 'p1', eventType: 'LAB_RESULT', date: '2024-01-01' });
    expect(e.date).toBeInstanceOf(Date);
    expect(e.date.getUTCFullYear()).toBe(2024);
  });

  it('isClinicallySignificant returns true for CRITICAL, SEVERE, MODERATE', () => {
    const severities: Array<ClinicalEvent['severity']> = ['CRITICAL', 'SEVERE', 'MODERATE'];
    for (const s of severities) {
      const e = new ClinicalEvent({ patientId: 'p1', eventType: 'DIAGNOSIS', date: new Date(), severity: s });
      expect(e.isClinicallySignificant()).toBe(true);
    }
  });

  it('isClinicallySignificant returns false for MILD and INFORMATIONAL', () => {
    const e1 = new ClinicalEvent({ patientId: 'p1', eventType: 'CONSULTATION', date: new Date(), severity: 'MILD' });
    const e2 = new ClinicalEvent({ patientId: 'p1', eventType: 'CONSULTATION', date: new Date(), severity: 'INFORMATIONAL' });
    expect(e1.isClinicallySignificant()).toBe(false);
    expect(e2.isClinicallySignificant()).toBe(false);
  });

  it('getBiomarkers returns all biomarkers', () => {
    const e = baseEvent();
    expect(e.getBiomarkers()).toHaveLength(2);
  });

  it('getBiomarkerValue is case-insensitive', () => {
    const e = baseEvent();
    expect(e.getBiomarkerValue('hba1c')).toBe(7.2);
    expect(e.getBiomarkerValue('HBA1C')).toBe(7.2);
    expect(e.getBiomarkerValue('glucose')).toBe(130);
    expect(e.getBiomarkerValue('unknown')).toBeUndefined();
  });

  it('daysSince computes correct floor', () => {
    const e = new ClinicalEvent({ patientId: 'p1', eventType: 'LAB_RESULT', date: new Date('2024-01-01') });
    const ref = new Date('2024-01-11T12:00:00');
    expect(e.daysSince(ref)).toBe(10);
  });

  it('isRecent uses 30-day default', () => {
    const recent = new ClinicalEvent({ patientId: 'p1', eventType: 'CONSULTATION', date: new Date() });
    const old = new ClinicalEvent({
      patientId: 'p1',
      eventType: 'CONSULTATION',
      date: new Date(Date.now() - 40 * 86_400_000),
    });
    expect(recent.isRecent()).toBe(true);
    expect(old.isRecent()).toBe(false);
  });
});

describe('BiomarkerTrend', () => {
  it('clamps confidence to [0,1]', () => {
    const t = new BiomarkerTrend({
      marker: 'HbA1c',
      firstValue: 6,
      lastValue: 5,
      minValue: 5,
      maxValue: 6,
      variation: -1,
      variationPercent: -16.7,
      direction: 'DOWN',
      classification: 'IMPROVING',
      confidence: 1.5,
      dataPoints: [],
      explanation: { eventsConsidered: 2, periodStart: new Date(), periodEnd: new Date(), influencingFactors: [], confidence: 1, reasoning: '' },
    });
    expect(t.confidence).toBe(1);
  });

  it('isImproving / isWorsening', () => {
    expect(makeTrend('hba1c', 'IMPROVING').isImproving()).toBe(true);
    expect(makeTrend('hba1c', 'WORSENING').isWorsening()).toBe(true);
    expect(makeTrend('hba1c', 'STABLE').isImproving()).toBe(false);
  });

  it('isWithinNormalRange uses lastValue when no arg', () => {
    const t = makeTrend('hba1c', 'IMPROVING');
    expect(t.isWithinNormalRange()).toBe(false); // 6.5 outside [4, 5.6]
    expect(t.isWithinNormalRange(5.0)).toBe(true);
  });

  it('isHighConfidence when >= 0.7', () => {
    const t = makeTrend('hba1c', 'STABLE');
    expect(t.isHighConfidence()).toBe(true);
  });

  it('getAbsoluteChange uses Math.abs', () => {
    const t = makeTrend('hba1c', 'IMPROVING'); // variation = -1
    expect(t.getAbsoluteChange()).toBe(1);
  });

  it('getSummary returns formatted string', () => {
    const t = makeTrend('HbA1c', 'IMPROVING');
    const summary = t.getSummary();
    expect(summary).toContain('HbA1c');
    expect(summary).toContain('IMPROVING');
    expect(summary).toContain('↓');
  });
});

describe('HealthTimeline', () => {
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-06-30');

  const makeTimeline = () => {
    const events = [
      new ClinicalEvent({ patientId: 'p1', eventType: 'CONSULTATION', date: new Date('2024-03-01'), severity: 'MILD' }),
      new ClinicalEvent({ patientId: 'p1', eventType: 'LAB_RESULT', date: new Date('2024-01-15'), severity: 'CRITICAL' }),
      new ClinicalEvent({ patientId: 'p1', eventType: 'DIAGNOSIS', date: new Date('2024-05-10'), severity: 'MODERATE' }),
    ];

    const trends = [makeTrend('hba1c', 'IMPROVING'), makeTrend('ldl', 'WORSENING')];

    return new HealthTimeline({
      patientId: 'p1',
      startDate,
      endDate,
      events,
      biomarkerTrends: trends,
      analytics: makeAnalytics(),
    });
  };

  it('sorts events chronologically in constructor', () => {
    const t = makeTimeline();
    const dates = t.events.map((e) => e.date.getTime());
    expect(dates[0]).toBeLessThan(dates[1]);
    expect(dates[1]).toBeLessThan(dates[2]);
  });

  it('getEventsByType filters correctly', () => {
    const t = makeTimeline();
    expect(t.getEventsByType('LAB_RESULT')).toHaveLength(1);
    expect(t.getEventsByType('HOSPITALIZATION')).toHaveLength(0);
  });

  it('getEventsInRange filters by date range', () => {
    const t = makeTimeline();
    const inRange = t.getEventsInRange(new Date('2024-01-01'), new Date('2024-03-31'));
    expect(inRange).toHaveLength(2);
  });

  it('getSignificantEvents returns CRITICAL + MODERATE', () => {
    const t = makeTimeline();
    expect(t.getSignificantEvents()).toHaveLength(2);
  });

  it('getTrendForMarker is case-insensitive', () => {
    const t = makeTimeline();
    expect(t.getTrendForMarker('HBA1C')).toBeDefined();
    expect(t.getTrendForMarker('LDL')).toBeDefined();
    expect(t.getTrendForMarker('glucose')).toBeUndefined();
  });

  it('hasWorseningTrends and hasImprovingTrends', () => {
    const t = makeTimeline();
    expect(t.hasWorseningTrends()).toBe(true);
    expect(t.hasImprovingTrends()).toBe(true);
  });

  it('spanDays computes correct value', () => {
    const t = makeTimeline();
    expect(t.spanDays()).toBeGreaterThan(0);
  });

  it('getLatestRiskScore returns undefined when no evolution', () => {
    const t = makeTimeline();
    expect(t.getLatestRiskScore()).toBeUndefined();
  });
});
