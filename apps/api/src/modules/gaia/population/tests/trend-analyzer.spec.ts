import { describe, it, expect } from '@jest/globals';
import {
  computeLinearSlope,
  classifyTrend,
  analyzeTrend,
  computePrevalence,
  computeIncidenceRate,
  detectSignificantTrends,
  computeMovingAverage,
} from '../engine/trend-analyzer.js';

describe('trend-analyzer', () => {
  describe('computeLinearSlope', () => {
    it('returns 0 for empty array', () => {
      expect(computeLinearSlope([])).toBe(0);
    });

    it('returns 0 for single value', () => {
      expect(computeLinearSlope([5])).toBe(0);
    });

    it('returns positive slope for increasing series', () => {
      expect(computeLinearSlope([1, 2, 3, 4, 5])).toBeGreaterThan(0);
    });

    it('returns negative slope for decreasing series', () => {
      expect(computeLinearSlope([5, 4, 3, 2, 1])).toBeLessThan(0);
    });

    it('returns 0 for flat series', () => {
      expect(computeLinearSlope([3, 3, 3, 3])).toBe(0);
    });
  });

  describe('classifyTrend', () => {
    it('returns INCREASING for positive slope above threshold', () => {
      expect(classifyTrend(0.5, 1, 0.02)).toBe('INCREASING');
    });

    it('returns DECREASING for negative slope above threshold', () => {
      expect(classifyTrend(-0.5, 1, 0.02)).toBe('DECREASING');
    });

    it('returns STABLE for slope below threshold', () => {
      expect(classifyTrend(0.001, 1, 0.02)).toBe('STABLE');
    });

    it('returns STABLE when baseline is 0 and slope is 0', () => {
      expect(classifyTrend(0, 0)).toBe('STABLE');
    });
  });

  describe('analyzeTrend', () => {
    it('returns STABLE for empty array', () => {
      const result = analyzeTrend([]);
      expect(result.direction).toBe('STABLE');
      expect(result.confidence).toBe(0);
    });

    it('returns STABLE for single value', () => {
      const result = analyzeTrend([5]);
      expect(result.direction).toBe('STABLE');
      expect(result.confidence).toBe(0.5);
    });

    it('detects INCREASING trend', () => {
      const result = analyzeTrend([10, 20, 30, 40, 50]);
      expect(result.direction).toBe('INCREASING');
    });

    it('detects DECREASING trend', () => {
      const result = analyzeTrend([50, 40, 30, 20, 10]);
      expect(result.direction).toBe('DECREASING');
    });

    it('isSignificant when changePercent >= 5', () => {
      const result = analyzeTrend([100, 106]);
      expect(result.isSignificant).toBe(true);
    });

    it('not significant when changePercent < 5', () => {
      const result = analyzeTrend([100, 102]);
      expect(result.isSignificant).toBe(false);
    });

    it('confidence increases with more data points', () => {
      const short = analyzeTrend([1, 2]);
      const long = analyzeTrend([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(long.confidence).toBeGreaterThan(short.confidence);
    });

    it('confidence never exceeds 0.99', () => {
      const values = Array.from({ length: 100 }, (_, i) => i);
      expect(analyzeTrend(values).confidence).toBeLessThanOrEqual(0.99);
    });

    it('returns correct firstValue and lastValue', () => {
      const result = analyzeTrend([10, 20, 30]);
      expect(result.firstValue).toBe(10);
      expect(result.lastValue).toBe(30);
    });
  });

  describe('computePrevalence', () => {
    it('returns 0 for empty cohort', () => {
      expect(computePrevalence(5, 0)).toBe(0);
    });

    it('returns 50% for half the cohort', () => {
      expect(computePrevalence(50, 100)).toBe(50);
    });

    it('returns 100% for full cohort', () => {
      expect(computePrevalence(20, 20)).toBe(100);
    });
  });

  describe('computeIncidenceRate', () => {
    it('returns 0 when populationAtRisk is 0', () => {
      expect(computeIncidenceRate(10, 0, 365)).toBe(0);
    });

    it('returns 0 when periodDays is 0', () => {
      expect(computeIncidenceRate(10, 100, 0)).toBe(0);
    });

    it('returns non-zero rate for valid inputs', () => {
      expect(computeIncidenceRate(10, 1000, 365)).toBeGreaterThan(0);
    });
  });

  describe('detectSignificantTrends', () => {
    it('returns only significant trends', () => {
      const result = detectSignificantTrends([
        { key: 'significant', values: [10, 20, 30, 40, 50] },
        { key: 'stable', values: [10, 10.1, 10, 10.05] },
      ]);
      expect(result.some((r) => r.key === 'significant')).toBe(true);
      expect(result.some((r) => r.key === 'stable')).toBe(false);
    });

    it('returns empty when no trends are significant', () => {
      expect(detectSignificantTrends([{ key: 'flat', values: [5, 5, 5] }])).toHaveLength(0);
    });
  });

  describe('computeMovingAverage', () => {
    it('returns empty for empty input', () => {
      expect(computeMovingAverage([], 3)).toHaveLength(0);
    });

    it('returns same length as input', () => {
      expect(computeMovingAverage([1, 2, 3, 4, 5], 3)).toHaveLength(5);
    });

    it('first value equals input when window is 1', () => {
      expect(computeMovingAverage([5, 10, 15], 1)[0]).toBe(5);
    });
  });
});
