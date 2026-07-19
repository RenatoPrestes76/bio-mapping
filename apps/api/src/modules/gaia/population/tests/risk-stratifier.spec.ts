import { describe, it, expect } from '@jest/globals';
import {
  stratifyRiskDistribution,
  computeMeanRisk,
  computeRiskTrend,
  computeHighRiskPercentage,
  estimateRiskScoreFromLevel,
  type RiskLevel,
} from '../engine/risk-stratifier.js';

describe('risk-stratifier', () => {
  describe('computeMeanRisk', () => {
    it('returns 0 for empty array', () => {
      expect(computeMeanRisk([])).toBe(0);
    });

    it('computes average of scores', () => {
      expect(computeMeanRisk([0.2, 0.4, 0.6])).toBeCloseTo(0.4, 3);
    });

    it('returns single value for one-element array', () => {
      expect(computeMeanRisk([0.75])).toBe(0.75);
    });
  });

  describe('estimateRiskScoreFromLevel', () => {
    it('LOW maps to 0.15', () => expect(estimateRiskScoreFromLevel('LOW')).toBe(0.15));
    it('MODERATE maps to 0.40', () => expect(estimateRiskScoreFromLevel('MODERATE')).toBe(0.40));
    it('HIGH maps to 0.65', () => expect(estimateRiskScoreFromLevel('HIGH')).toBe(0.65));
    it('VERY_HIGH maps to 0.80', () => expect(estimateRiskScoreFromLevel('VERY_HIGH')).toBe(0.80));
    it('CRITICAL maps to 0.95', () => expect(estimateRiskScoreFromLevel('CRITICAL')).toBe(0.95));
    it('unknown level returns 0.3', () => expect(estimateRiskScoreFromLevel('UNKNOWN' as RiskLevel)).toBe(0.3));
  });

  describe('stratifyRiskDistribution', () => {
    const levels: RiskLevel[] = ['LOW', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'];

    it('counts each level correctly', () => {
      const result = stratifyRiskDistribution(levels);
      expect(result.counts.LOW).toBe(2);
      expect(result.counts.MODERATE).toBe(1);
      expect(result.counts.HIGH).toBe(1);
      expect(result.counts.CRITICAL).toBe(1);
    });

    it('total equals input length', () => {
      expect(stratifyRiskDistribution(levels).total).toBe(5);
    });

    it('percentages sum to 100', () => {
      const { percentages } = stratifyRiskDistribution(levels);
      const sum = Object.values(percentages).reduce((s, v) => s + v, 0);
      expect(sum).toBeCloseTo(100, 0);
    });

    it('meanRisk is between 0 and 1', () => {
      const { meanRisk } = stratifyRiskDistribution(levels);
      expect(meanRisk).toBeGreaterThan(0);
      expect(meanRisk).toBeLessThan(1);
    });

    it('returns zeros for empty input', () => {
      const result = stratifyRiskDistribution([]);
      expect(result.total).toBe(0);
      expect(result.counts.LOW).toBe(0);
      expect(result.meanRisk).toBe(0);
    });

    it('all-HIGH distribution has high meanRisk', () => {
      const all: RiskLevel[] = ['HIGH', 'HIGH', 'HIGH'];
      expect(stratifyRiskDistribution(all).meanRisk).toBeGreaterThan(0.5);
    });
  });

  describe('computeRiskTrend', () => {
    it('returns INCREASING when current > previous by 2pp', () => {
      expect(computeRiskTrend(0.5, 0.45).direction).toBe('INCREASING');
    });

    it('returns DECREASING when current < previous by 2pp', () => {
      expect(computeRiskTrend(0.40, 0.45).direction).toBe('DECREASING');
    });

    it('returns STABLE when difference is tiny', () => {
      expect(computeRiskTrend(0.40, 0.401).direction).toBe('STABLE');
    });

    it('returns positive changePp for increase', () => {
      const { changePp } = computeRiskTrend(0.5, 0.4);
      expect(changePp).toBeGreaterThan(0);
    });

    it('returns negative changePp for decrease', () => {
      const { changePp } = computeRiskTrend(0.3, 0.4);
      expect(changePp).toBeLessThan(0);
    });
  });

  describe('computeHighRiskPercentage', () => {
    it('returns 0 for empty array', () => {
      expect(computeHighRiskPercentage([])).toBe(0);
    });

    it('counts HIGH, VERY_HIGH, CRITICAL as high risk', () => {
      const levels: RiskLevel[] = ['HIGH', 'VERY_HIGH', 'CRITICAL', 'LOW', 'MODERATE'];
      expect(computeHighRiskPercentage(levels)).toBe(60);
    });

    it('returns 0 when all LOW or MODERATE', () => {
      expect(computeHighRiskPercentage(['LOW', 'MODERATE', 'LOW'])).toBe(0);
    });
  });
});
