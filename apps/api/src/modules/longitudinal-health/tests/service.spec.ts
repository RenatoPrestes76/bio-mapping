import { NotFoundException } from '@nestjs/common';
import { LongitudinalHealthService } from '../longitudinal-health.service.js';
import { LongitudinalHealthProvider } from '../providers/longitudinal-health.provider.js';
import type { AnalyzeLongitudinalDto } from '../dto/longitudinal-health.dto.js';

const makeDto = (patientId = 'p1'): AnalyzeLongitudinalDto => ({
  patientId,
  events: [
    {
      eventType: 'LAB_RESULT',
      date: '2024-01-15',
      source: 'LAB',
      metadata: { biomarkers: [{ marker: 'HbA1c', value: 7.5, unit: '%' }] },
    },
    {
      eventType: 'LAB_RESULT',
      date: '2024-06-01',
      source: 'LAB',
      metadata: { biomarkers: [{ marker: 'HbA1c', value: 6.8, unit: '%' }] },
    },
    {
      eventType: 'CONSULTATION',
      date: '2024-03-10',
      severity: 'MILD',
      metadata: {},
    },
  ],
  includeRiskEvolution: true,
});

describe('LongitudinalHealthService', () => {
  let service: LongitudinalHealthService;
  let provider: LongitudinalHealthProvider;

  beforeEach(() => {
    provider = new LongitudinalHealthProvider();
    service = new LongitudinalHealthService(provider);
  });

  describe('analyze()', () => {
    it('returns a HealthTimeline with correct patientId', () => {
      const timeline = service.analyze(makeDto());
      expect(timeline.patientId).toBe('p1');
    });

    it('populates events from dto', () => {
      const timeline = service.analyze(makeDto());
      expect(timeline.events).toHaveLength(3);
    });

    it('detects HbA1c trend', () => {
      const timeline = service.analyze(makeDto());
      const trend = timeline.getTrendForMarker('HbA1c');
      expect(trend).toBeDefined();
      expect(trend!.direction).toBe('DOWN');
    });

    it('includes analytics', () => {
      const timeline = service.analyze(makeDto());
      expect(timeline.analytics.totalEvents).toBe(3);
    });

    it('merges events on subsequent analyze calls', () => {
      service.analyze(makeDto('p2'));
      const dto2: AnalyzeLongitudinalDto = {
        patientId: 'p2',
        events: [{ eventType: 'CONSULTATION', date: '2024-08-01', metadata: {} }],
      };
      const timeline = service.analyze(dto2);
      expect(timeline.events.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getTimeline()', () => {
    it('returns timeline after analyze', () => {
      service.analyze(makeDto('p3'));
      const timeline = service.getTimeline('p3');
      expect(timeline.patientId).toBe('p3');
    });

    it('throws NotFoundException for unknown patient', () => {
      expect(() => service.getTimeline('unknown')).toThrow(NotFoundException);
    });
  });

  describe('getTrends()', () => {
    it('returns trends after analyze', () => {
      service.analyze(makeDto('p4'));
      const trends = service.getTrends('p4');
      expect(trends.length).toBeGreaterThan(0);
    });

    it('throws NotFoundException for unknown patient', () => {
      expect(() => service.getTrends('unknown-patient')).toThrow(NotFoundException);
    });
  });

  describe('getReport()', () => {
    it('returns report after analyze', () => {
      service.analyze(makeDto('p5'));
      const report = service.getReport('p5');
      expect(report).toBeDefined();
      expect(report!.timeline.patientId).toBe('p5');
    });

    it('throws NotFoundException for unknown patient', () => {
      expect(() => service.getReport('unknown')).toThrow(NotFoundException);
    });
  });
});
