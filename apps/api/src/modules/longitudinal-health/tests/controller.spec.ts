import { NotFoundException } from '@nestjs/common';
import { LongitudinalHealthController } from '../longitudinal-health.controller.js';
import { LongitudinalHealthService } from '../longitudinal-health.service.js';
import { LongitudinalHealthProvider } from '../providers/longitudinal-health.provider.js';
import type { AnalyzeLongitudinalDto } from '../dto/longitudinal-health.dto.js';

const mockUser = { sub: 'user-1' };

const makeDto = (patientId = 'ctrl-p1'): AnalyzeLongitudinalDto => ({
  patientId,
  events: [
    {
      eventType: 'LAB_RESULT',
      date: '2024-02-01',
      source: 'LAB',
      metadata: { biomarkers: [{ marker: 'glucose', value: 105, unit: 'mg/dL' }] },
    },
    {
      eventType: 'LAB_RESULT',
      date: '2024-05-01',
      source: 'LAB',
      metadata: { biomarkers: [{ marker: 'glucose', value: 95, unit: 'mg/dL' }] },
    },
    {
      eventType: 'DIAGNOSIS',
      date: '2024-01-01',
      severity: 'MODERATE',
      metadata: { conditionName: 'diabetes', stage: 'PRE_DIABETIC' },
    },
  ],
  includeRiskEvolution: false,
});

describe('LongitudinalHealthController', () => {
  let controller: LongitudinalHealthController;
  let service: LongitudinalHealthService;

  beforeEach(() => {
    const provider = new LongitudinalHealthProvider();
    service = new LongitudinalHealthService(provider);
    controller = new LongitudinalHealthController(service);
  });

  describe('POST /analyze', () => {
    it('returns a HealthTimeline', () => {
      const timeline = controller.analyze(makeDto(), mockUser);
      expect(timeline.patientId).toBe('ctrl-p1');
    });

    it('timeline contains the submitted events', () => {
      const timeline = controller.analyze(makeDto(), mockUser);
      expect(timeline.events.length).toBeGreaterThan(0);
    });
  });

  describe('GET /timeline/:patientId', () => {
    it('returns stored timeline', () => {
      controller.analyze(makeDto('ctrl-p2'), mockUser);
      const timeline = controller.getTimeline('ctrl-p2', mockUser);
      expect(timeline.patientId).toBe('ctrl-p2');
    });

    it('throws 404 for unknown patient', () => {
      expect(() => controller.getTimeline('nonexistent', mockUser)).toThrow(NotFoundException);
    });
  });

  describe('GET /trends/:patientId', () => {
    it('returns biomarker trends', () => {
      controller.analyze(makeDto('ctrl-p3'), mockUser);
      const trends = controller.getTrends('ctrl-p3', mockUser);
      expect(Array.isArray(trends)).toBe(true);
    });

    it('throws 404 for unknown patient', () => {
      expect(() => controller.getTrends('nonexistent', mockUser)).toThrow(NotFoundException);
    });
  });

  describe('GET /report/:patientId', () => {
    it('returns a report with timeline and summary', () => {
      controller.analyze(makeDto('ctrl-p4'), mockUser);
      const report = controller.getReport('ctrl-p4', mockUser);
      expect(report).toBeDefined();
      expect(report!.timeline).toBeDefined();
    });

    it('throws 404 for unknown patient', () => {
      expect(() => controller.getReport('nonexistent', mockUser)).toThrow(NotFoundException);
    });
  });
});
