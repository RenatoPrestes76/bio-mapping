import { describe, it, expect } from '@jest/globals';
import {
  calculateLinearTrend,
  detectSignificantChange,
  computeMovingAverage,
  summarizeLongitudinalData,
  groupMetricsByName,
  type DataPoint,
} from '../engine/longitudinal-analyzer.js';

const makePoints = (values: number[], metric = 'glucose'): DataPoint[] =>
  values.map((value, i) => ({
    value,
    metricName: metric,
    recordedAt: new Date(Date.now() - (values.length - i - 1) * 86400000),
  }));

describe('longitudinal-analyzer', () => {
  describe('computeMovingAverage', () => {
    it('returns empty for empty input', () => {
      expect(computeMovingAverage([], 3)).toHaveLength(0);
    });
    it('returns same length as input', () => {
      expect(computeMovingAverage([1, 2, 3, 4, 5], 3)).toHaveLength(5);
    });
    it('first element equals first value (window=3)', () => {
      const result = computeMovingAverage([10, 20, 30], 3);
      expect(result[0]).toBe(10);
    });
    it('last element is average of last 3', () => {
      const result = computeMovingAverage([10, 20, 30, 40, 50], 3);
      expect(result[4]).toBe(40);
    });
    it('handles window larger than array', () => {
      const result = computeMovingAverage([10, 20], 5);
      expect(result).toHaveLength(2);
    });
  });

  describe('calculateLinearTrend', () => {
    it('returns zero slope for empty input', () => {
      const result = calculateLinearTrend([]);
      expect(result.slope).toBe(0);
      expect(result.direction).toBe('STABLE');
      expect(result.dataPoints).toBe(0);
    });
    it('returns zero slope for single point', () => {
      const result = calculateLinearTrend(makePoints([85]));
      expect(result.slope).toBe(0);
      expect(result.firstValue).toBe(85);
    });
    it('detects worsening (increasing) trend', () => {
      const result = calculateLinearTrend(makePoints([70, 80, 90, 100, 110, 120]));
      expect(result.direction).toBe('WORSENING');
      expect(result.slope).toBeGreaterThan(0);
    });
    it('detects improving (decreasing) trend', () => {
      const result = calculateLinearTrend(makePoints([120, 110, 100, 90, 80, 70]));
      expect(result.direction).toBe('IMPROVING');
      expect(result.slope).toBeLessThan(0);
    });
    it('detects stable trend', () => {
      const result = calculateLinearTrend(makePoints([85, 86, 85, 84, 85, 86]));
      expect(result.direction).toBe('STABLE');
    });
    it('calculates percent change', () => {
      const result = calculateLinearTrend(makePoints([100, 100, 100, 100, 150]));
      expect(result.percentChange).toBeGreaterThan(0);
    });
    it('returns correct firstValue and lastValue', () => {
      const pts = makePoints([70, 90, 110]);
      const result = calculateLinearTrend(pts);
      expect(result.firstValue).toBe(70);
      expect(result.lastValue).toBe(110);
    });
  });

  describe('detectSignificantChange', () => {
    it('returns false for empty arrays', () => {
      expect(detectSignificantChange([], [])).toBe(false);
    });
    it('returns false for stable values', () => {
      expect(detectSignificantChange([85, 86, 84], [85, 87, 84])).toBe(false);
    });
    it('returns true for significant change', () => {
      expect(detectSignificantChange([120, 130, 125], [80, 82, 81])).toBe(true);
    });
    it('uses custom threshold', () => {
      expect(detectSignificantChange([110, 115], [100, 100], 0.05)).toBe(true);
      expect(detectSignificantChange([110, 115], [100, 100], 0.20)).toBe(false);
    });
    it('returns false when baseline mean is 0', () => {
      expect(detectSignificantChange([10, 20], [0, 0])).toBe(false);
    });
  });

  describe('summarizeLongitudinalData', () => {
    it('returns null for empty input', () => {
      expect(summarizeLongitudinalData([])).toBeNull();
    });
    it('returns summary with all required fields', () => {
      const result = summarizeLongitudinalData(makePoints([80, 85, 90, 95, 100, 105, 110, 120]));
      expect(result).not.toBeNull();
      expect(result!.metricName).toBe('glucose');
      expect(result!.min).toBeLessThan(result!.max);
      expect(result!.trend).toBeDefined();
      expect(result!.latest).toBe(120);
    });
    it('detects significant change flag', () => {
      const result = summarizeLongitudinalData(makePoints([80, 80, 80, 80, 140, 145, 150, 155]));
      expect(result!.significantChange).toBe(true);
    });
    it('no significant change for stable data', () => {
      const result = summarizeLongitudinalData(makePoints([85, 84, 86, 85, 87, 84, 86, 85]));
      expect(result!.significantChange).toBe(false);
    });
    it('latest is the most recent recorded value', () => {
      const pts = makePoints([100, 110, 120]);
      const result = summarizeLongitudinalData(pts);
      expect(result!.latest).toBe(120);
    });
  });

  describe('groupMetricsByName', () => {
    it('groups data points by metric name', () => {
      const points = [
        ...makePoints([80, 90], 'glucose'),
        ...makePoints([120, 130], 'systolicBp'),
      ];
      const grouped = groupMetricsByName(points);
      expect(Object.keys(grouped)).toHaveLength(2);
      expect(grouped['glucose']).toHaveLength(2);
      expect(grouped['systolicBp']).toHaveLength(2);
    });
    it('handles single metric', () => {
      const grouped = groupMetricsByName(makePoints([80, 85, 90], 'glucose'));
      expect(Object.keys(grouped)).toHaveLength(1);
    });
    it('returns empty object for empty input', () => {
      expect(Object.keys(groupMetricsByName([]))).toHaveLength(0);
    });
  });
});
