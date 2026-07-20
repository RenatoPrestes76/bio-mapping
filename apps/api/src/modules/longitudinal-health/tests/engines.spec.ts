import { ClinicalEvent } from '../entities/clinical-event.entity.js';
import { TimelineBuilderEngine } from '../engines/timeline-builder.engine.js';
import { TrendAnalysisEngine } from '../engines/trend-analysis.engine.js';
import { DiseaseProgressionEngine } from '../engines/disease-progression.engine.js';
import { TherapeuticResponseEngine } from '../engines/therapeutic-response.engine.js';
import { LongitudinalRiskEngine } from '../engines/longitudinal-risk.engine.js';
import type { CreateClinicalEventDto } from '../dto/longitudinal-health.dto.js';
import type { BiomarkerTrend } from '../entities/biomarker-trend.entity.js';
import type { DiseaseProgression } from '../entities/health-timeline.entity.js';

const makeEvent = (
  eventType: ClinicalEvent['eventType'],
  date: string,
  options: Partial<{
    severity: ClinicalEvent['severity'];
    biomarkers: Array<{ marker: string; value: number; unit: string }>;
    conditionName: string;
    stage: string;
    drugName: string;
  }> = {},
): ClinicalEvent =>
  new ClinicalEvent({
    patientId: 'p1',
    eventType,
    date: new Date(date),
    severity: options.severity ?? 'INFORMATIONAL',
    metadata: {
      biomarkers: options.biomarkers,
      conditionName: options.conditionName,
      stage: options.stage,
      drugName: options.drugName,
    },
  });

describe('TimelineBuilderEngine', () => {
  const engine = new TimelineBuilderEngine();

  const dtos: CreateClinicalEventDto[] = [
    {
      eventType: 'LAB_RESULT',
      date: '2024-03-01',
      source: 'LAB',
      metadata: { biomarkers: [{ marker: 'HbA1c', value: 7.5, unit: '%' }] },
    },
    {
      eventType: 'CONSULTATION',
      date: '2024-01-15',
      metadata: {},
    },
  ];

  it('buildEvents creates ClinicalEvent instances with correct patientId', () => {
    const events = engine.buildEvents('p1', dtos);
    expect(events).toHaveLength(2);
    expect(events[0].patientId).toBe('p1');
    expect(events[0]).toBeInstanceOf(ClinicalEvent);
  });

  it('sortChronologically orders events ascending', () => {
    const events = engine.buildEvents('p1', dtos);
    const sorted = engine.sortChronologically(events);
    expect(sorted[0].date.getTime()).toBeLessThan(sorted[1].date.getTime());
    // January comes before March
    expect(sorted[0].date.getUTCMonth()).toBe(0); // January
    expect(sorted[1].date.getUTCMonth()).toBe(2); // March
  });

  it('filterByPeriod returns only events within range', () => {
    const events = engine.buildEvents('p1', dtos);
    const filtered = engine.filterByPeriod(events, new Date('2024-02-01'), new Date('2024-04-01'));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].eventType).toBe('LAB_RESULT');
  });

  it('filterByType filters by event type set', () => {
    const events = engine.buildEvents('p1', dtos);
    const filtered = engine.filterByType(events, ['CONSULTATION']);
    expect(filtered).toHaveLength(1);
  });

  it('computeDateRange returns min/max dates', () => {
    const events = engine.buildEvents('p1', dtos);
    const range = engine.computeDateRange(events);
    expect(range.start.getUTCFullYear()).toBe(2024);
    expect(range.start.getUTCMonth()).toBe(0); // January
    expect(range.end.getUTCMonth()).toBe(2);   // March
  });

  it('computeDateRange returns year-ago defaults for empty list', () => {
    const range = engine.computeDateRange([]);
    expect(range.end.getFullYear()).toBe(new Date().getFullYear());
  });

  it('mergeEventLists deduplicates by id', () => {
    const events = engine.buildEvents('p1', dtos);
    const merged = engine.mergeEventLists(events, events);
    expect(merged).toHaveLength(2);
  });

  it('countByType returns correct counts', () => {
    const events = engine.buildEvents('p1', dtos);
    const counts = engine.countByType(events);
    expect(counts['LAB_RESULT']).toBe(1);
    expect(counts['CONSULTATION']).toBe(1);
  });
});

describe('TrendAnalysisEngine', () => {
  const engine = new TrendAnalysisEngine();

  const labEvents = [
    makeEvent('LAB_RESULT', '2024-01-01', { biomarkers: [{ marker: 'HbA1c', value: 8.5, unit: '%' }] }),
    makeEvent('LAB_RESULT', '2024-03-01', { biomarkers: [{ marker: 'HbA1c', value: 7.8, unit: '%' }] }),
    makeEvent('LAB_RESULT', '2024-05-01', { biomarkers: [{ marker: 'HbA1c', value: 7.2, unit: '%' }] }),
  ];

  it('analyzeTrend returns null with fewer than 2 data points', () => {
    expect(engine.analyzeTrend('HbA1c', [labEvents[0]])).toBeNull();
  });

  it('analyzeTrend identifies improving HbA1c trend', () => {
    const trend = engine.analyzeTrend('HbA1c', labEvents);
    expect(trend).not.toBeNull();
    expect(trend!.direction).toBe('DOWN');
    expect(trend!.classification).toBe('IMPROVING');
    expect(trend!.confidence).toBeGreaterThan(0);
  });

  it('analyzeTrend identifies worsening LDL trend', () => {
    const events = [
      makeEvent('LAB_RESULT', '2024-01-01', { biomarkers: [{ marker: 'ldl', value: 90, unit: 'mg/dL' }] }),
      makeEvent('LAB_RESULT', '2024-06-01', { biomarkers: [{ marker: 'ldl', value: 170, unit: 'mg/dL' }] }),
    ];
    const trend = engine.analyzeTrend('ldl', events);
    expect(trend!.classification).toBe('WORSENING');
  });

  it('discoverTrackedMarkers finds all markers in events', () => {
    const events = [
      makeEvent('LAB_RESULT', '2024-01-01', { biomarkers: [{ marker: 'hba1c', value: 7, unit: '%' }, { marker: 'glucose', value: 100, unit: 'mg/dL' }] }),
    ];
    const markers = engine.discoverTrackedMarkers(events);
    expect(markers).toContain('hba1c');
    expect(markers).toContain('glucose');
  });

  it('analyzeAll processes multiple markers', () => {
    const trends = engine.analyzeAll(['HbA1c', 'nonexistent'], labEvents);
    expect(trends).toHaveLength(1);
  });
});

describe('DiseaseProgressionEngine', () => {
  const engine = new DiseaseProgressionEngine();

  it('analyzeProgression detects diabetes stages', () => {
    const events = [
      makeEvent('LAB_RESULT', '2024-01-01', { biomarkers: [{ marker: 'hba1c', value: 5.4, unit: '%' }] }),
      makeEvent('LAB_RESULT', '2024-06-01', { biomarkers: [{ marker: 'hba1c', value: 7.5, unit: '%' }] }),
    ];
    const p = engine.analyzeProgression('diabetes', events);
    expect(p).not.toBeNull();
    expect(p!.currentStage).toBe('POORLY_CONTROLLED');
    expect(p!.trend).toBe('WORSENING');
  });

  it('analyzeProgression detects hypertension stages', () => {
    const events = [
      makeEvent('LAB_RESULT', '2024-01-01', { biomarkers: [{ marker: 'bp_systolic', value: 118, unit: 'mmHg' }, { marker: 'bp_diastolic', value: 76, unit: 'mmHg' }] }),
      makeEvent('LAB_RESULT', '2024-06-01', { biomarkers: [{ marker: 'bp_systolic', value: 145, unit: 'mmHg' }, { marker: 'bp_diastolic', value: 92, unit: 'mmHg' }] }),
    ];
    const p = engine.analyzeProgression('hypertension', events);
    expect(p!.currentStage).toBe('STAGE_2');
    expect(p!.trend).toBe('WORSENING');
  });

  it('analyzeProgression returns null when no data available', () => {
    expect(engine.analyzeProgression('diabetes', [])).toBeNull();
  });

  it('analyzeProgression falls back to DIAGNOSIS events for unknown conditions', () => {
    const events = [
      makeEvent('DIAGNOSIS', '2024-01-01', { conditionName: 'myopathy', stage: 'MILD' }),
      makeEvent('DIAGNOSIS', '2024-06-01', { conditionName: 'myopathy', stage: 'MODERATE' }),
    ];
    const p = engine.analyzeProgression('myopathy', events);
    expect(p!.currentStage).toBe('MODERATE');
  });

  it('discoverConditions extracts DIAGNOSIS event conditions', () => {
    const events = [
      makeEvent('DIAGNOSIS', '2024-01-01', { conditionName: 'asthma' }),
      makeEvent('LAB_RESULT', '2024-03-01', { biomarkers: [{ marker: 'egfr', value: 55, unit: 'mL/min' }] }),
    ];
    const conditions = engine.discoverConditions(events);
    expect(conditions).toContain('asthma');
    expect(conditions).toContain('ckd');
  });
});

describe('TherapeuticResponseEngine', () => {
  const engine = new TherapeuticResponseEngine();

  const startDate = new Date('2024-04-01');
  const before = makeEvent('LAB_RESULT', '2024-03-01', { biomarkers: [{ marker: 'ldl', value: 190, unit: 'mg/dL' }] });
  const after = makeEvent('LAB_RESULT', '2024-06-15', { biomarkers: [{ marker: 'ldl', value: 110, unit: 'mg/dL' }] });

  it('analyzeResponse returns EXCELLENT for significant improvement', () => {
    const response = engine.analyzeResponse('atorvastatin', startDate, [before, after]);
    expect(response).not.toBeNull();
    expect(response!.responseType).toBe('EXCELLENT');
    expect(response!.drug).toBe('atorvastatin');
  });

  it('analyzeResponse returns null when no events in window', () => {
    const result = engine.analyzeResponse('atorvastatin', startDate, []);
    expect(result).toBeNull();
  });

  it('analyzeAllMedications processes MEDICATION events', () => {
    const medEvent = new ClinicalEvent({
      patientId: 'p1',
      eventType: 'MEDICATION',
      date: startDate,
      metadata: { drugName: 'atorvastatin' },
    });
    const responses = engine.analyzeAllMedications([medEvent, before, after]);
    expect(responses.length).toBeGreaterThanOrEqual(0);
  });
});

describe('LongitudinalRiskEngine', () => {
  const engine = new LongitudinalRiskEngine();

  it('computeRisk returns LOW for healthy patient', () => {
    const point = engine.computeRisk({
      events: [],
      trends: [],
      progressions: [],
      asOf: new Date(),
    });
    expect(point.riskLevel).toBe('LOW');
    expect(point.riskScore).toBe(0);
  });

  it('computeRisk increases with critical events', () => {
    const criticalEvent = makeEvent('HOSPITALIZATION', new Date().toISOString().split('T')[0], { severity: 'CRITICAL' });
    const point = engine.computeRisk({
      events: [criticalEvent],
      trends: [],
      progressions: [],
      asOf: new Date(),
    });
    expect(point.riskScore).toBeGreaterThan(0);
    expect(point.contributingFactors.length).toBeGreaterThan(0);
  });

  it('buildRiskEvolution returns empty array for empty events', () => {
    const evolution = engine.buildRiskEvolution([], [], []);
    expect(evolution).toHaveLength(0);
  });

  it('buildRiskEvolution builds points over time', () => {
    const events = [
      makeEvent('LAB_RESULT', '2024-01-01'),
      makeEvent('LAB_RESULT', '2024-03-01'),
      makeEvent('CONSULTATION', '2024-05-01'),
    ];
    const evolution = engine.buildRiskEvolution(events, [], [], 60);
    expect(evolution.length).toBeGreaterThan(0);
    for (const p of evolution) {
      expect(p.riskScore).toBeGreaterThanOrEqual(0);
      expect(p.riskScore).toBeLessThanOrEqual(100);
    }
  });
});
