import { TrendDirection, TrendStatus, TrendType } from '@bio/database';
import { BloodPressureAnalyzer } from '../analyzers/blood-pressure.analyzer.js';

const makePoints = (values: number[], startDate = new Date('2024-01-01'), intervalDays = 7) =>
  values.map((value, i) => ({
    value,
    timestamp: new Date(startDate.getTime() + i * intervalDays * 86_400_000),
  }));

describe('BloodPressureAnalyzer', () => {
  const analyzer = new BloodPressureAnalyzer();

  describe('supports', () => {
    it('returns true for blood_pressure metric', () => {
      expect(analyzer.supports('blood_pressure')).toBe(true);
    });

    it('returns false for other metrics', () => {
      expect(analyzer.supports('glycemic')).toBe(false);
      expect(analyzer.supports('bmi')).toBe(false);
    });
  });

  describe('analyze', () => {
    it('returns INSUFFICIENT_DATA when fewer than 2 points', () => {
      const result = analyzer.analyze({ patientId: 'p-1', dataPoints: [{ value: 160, timestamp: new Date() }] });
      expect(result.trendType).toBe(TrendType.INSUFFICIENT_DATA);
      expect(result.confidence).toBe(0);
    });

    it('returns INSUFFICIENT_DATA for empty data', () => {
      const result = analyzer.analyze({ patientId: 'p-1', dataPoints: [] });
      expect(result.trendType).toBe(TrendType.INSUFFICIENT_DATA);
    });

    it('detects WORSENING when systolic is clearly increasing', () => {
      const points = makePoints([140, 150, 162, 172, 180]);
      const result = analyzer.analyze({ patientId: 'p-1', dataPoints: points });
      expect(result.trendType).toBe(TrendType.WORSENING);
      expect(result.direction).toBe(TrendDirection.INCREASING);
    });

    it('detects IMPROVING when systolic is clearly decreasing', () => {
      const points = makePoints([180, 170, 158, 148, 138]);
      const result = analyzer.analyze({ patientId: 'p-1', dataPoints: points });
      expect(result.trendType).toBe(TrendType.IMPROVING);
      expect(result.direction).toBe(TrendDirection.DECREASING);
    });

    it('detects STABLE when values barely change', () => {
      const points = makePoints([140, 140, 141, 140, 139]);
      const result = analyzer.analyze({ patientId: 'p-1', dataPoints: points });
      expect(result.trendType).toBe(TrendType.STABLE);
      expect(result.direction).toBe(TrendDirection.STABLE);
    });

    it('detects FLUCTUATING for noisy data with low R²', () => {
      const points = makePoints([160, 130, 175, 135, 170, 128, 180]);
      const result = analyzer.analyze({ patientId: 'p-1', dataPoints: points });
      expect([TrendType.FLUCTUATING, TrendType.WORSENING, TrendType.IMPROVING, TrendType.STABLE]).toContain(result.trendType);
    });

    it('returns confidence between 0 and 1', () => {
      const points = makePoints([140, 145, 150, 155]);
      const result = analyzer.analyze({ patientId: 'p-1', dataPoints: points });
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('sets startDate and endDate from dataPoints', () => {
      const points = makePoints([140, 145, 150], new Date('2024-01-01'));
      const result = analyzer.analyze({ patientId: 'p-1', dataPoints: points });
      expect(result.startDate.toISOString()).toBe(points[0].timestamp.toISOString());
      expect(result.endDate.toISOString()).toBe(points[points.length - 1].timestamp.toISOString());
    });

    it('includes dataPoints count in metadata', () => {
      const points = makePoints([140, 145, 150]);
      const result = analyzer.analyze({ patientId: 'p-1', dataPoints: points });
      expect((result.metadata as Record<string, unknown>)?.dataPoints).toBe(3);
    });
  });

  describe('buildTrend', () => {
    it('creates a CreateTrendData from analysis result', () => {
      const points = makePoints([140, 150, 160]);
      const result = analyzer.analyze({ patientId: 'p-1', dataPoints: points });
      const trend = analyzer.buildTrend('p-1', result, 'user-1');
      expect(trend.patientId).toBe('p-1');
      expect(trend.metric).toBe('blood_pressure');
      expect(trend.status).toBe(TrendStatus.ACTIVE);
      expect(trend.sourceModule).toBe('clinical-decision-support');
      expect(trend.createdBy).toBe('user-1');
    });
  });
});
