import { describe, it, expect } from '@jest/globals';
import {
  detectDataDrift,
  detectConceptDrift,
  detectFeatureDrift,
  detectPopulationDrift,
  calculateKLDivergence,
  calculateMeanDrift,
  runAllDriftDetectors,
} from '../engine/drift-detector.js';

describe('drift-detector', () => {
  describe('calculateMeanDrift', () => {
    it('returns 0 for identical distributions', () => {
      expect(calculateMeanDrift([1, 2, 3, 4], [1, 2, 3, 4])).toBe(0);
    });
    it('returns 0 for empty arrays', () => {
      expect(calculateMeanDrift([], [])).toBe(0);
    });
    it('returns positive value for different distributions', () => {
      expect(calculateMeanDrift([1, 1, 1], [10, 10, 10])).toBeGreaterThan(0);
    });
    it('is symmetric', () => {
      const a = [1, 2, 3];
      const b = [4, 5, 6];
      expect(calculateMeanDrift(a, b)).toBeCloseTo(calculateMeanDrift(b, a), 3);
    });
  });

  describe('calculateKLDivergence', () => {
    it('returns 0 for identical distributions', () => {
      expect(calculateKLDivergence([0.5, 0.5], [0.5, 0.5])).toBeCloseTo(0, 2);
    });
    it('returns 0 for empty arrays', () => {
      expect(calculateKLDivergence([], [])).toBe(0);
    });
    it('returns positive value for divergent distributions', () => {
      expect(calculateKLDivergence([0.9, 0.1], [0.1, 0.9])).toBeGreaterThan(0);
    });
  });

  describe('detectDataDrift', () => {
    it('detects no drift when distributions are identical', () => {
      const result = detectDataDrift([1, 2, 3, 4, 5], [1, 2, 3, 4, 5], 0.1);
      expect(result.hasDrift).toBe(false);
      expect(result.driftType).toBe('DATA_DRIFT');
    });
    it('detects drift when distributions diverge significantly', () => {
      const baseline = [1, 1, 1, 1, 1, 1, 1, 1];
      const current = [10, 10, 10, 10, 10, 10, 10, 10];
      const result = detectDataDrift(baseline, current, 0.1);
      expect(result.hasDrift).toBe(true);
    });
    it('uses default threshold of 0.1', () => {
      const result = detectDataDrift([1, 2, 3], [1, 2, 3]);
      expect(result.threshold).toBe(0.1);
    });
    it('returns correct severity CRITICAL for large drift', () => {
      const result = detectDataDrift([0, 0, 0, 0, 0], [100, 100, 100, 100, 100], 0.1);
      expect(result.severity).toBe('CRITICAL');
    });
    it('returns LOW severity when just below threshold', () => {
      const result = detectDataDrift([1, 2, 3], [1, 2, 3], 0.1);
      expect(result.severity).toBe('LOW');
    });
  });

  describe('detectConceptDrift', () => {
    it('detects no drift with stable accuracies', () => {
      const result = detectConceptDrift([0.8, 0.82, 0.79, 0.81, 0.80, 0.82], 0.05);
      expect(result.hasDrift).toBe(false);
      expect(result.driftType).toBe('CONCEPT_DRIFT');
    });
    it('detects drift when accuracy degrades significantly', () => {
      const result = detectConceptDrift([0.9, 0.9, 0.9, 0.5, 0.5, 0.5], 0.05);
      expect(result.hasDrift).toBe(true);
    });
    it('returns no drift with less than 2 samples', () => {
      const result = detectConceptDrift([0.9], 0.05);
      expect(result.hasDrift).toBe(false);
    });
    it('handles empty array', () => {
      const result = detectConceptDrift([], 0.05);
      expect(result.hasDrift).toBe(false);
    });
  });

  describe('detectFeatureDrift', () => {
    it('detects no drift when stats are identical', () => {
      const stats = { bmi: 25, hba1c: 5.5, age: 45 };
      const result = detectFeatureDrift(stats, stats, 0.1);
      expect(result.hasDrift).toBe(false);
      expect(result.driftType).toBe('FEATURE_DRIFT');
    });
    it('detects drift and lists affected features', () => {
      const baseline = { bmi: 25, hba1c: 5.5 };
      const current = { bmi: 50, hba1c: 5.5 };
      const result = detectFeatureDrift(baseline, current, 0.1);
      expect(result.hasDrift).toBe(true);
      expect(result.affectedFeatures).toContain('bmi');
      expect(result.affectedFeatures).not.toContain('hba1c');
    });
    it('handles empty feature stats', () => {
      const result = detectFeatureDrift({}, {}, 0.1);
      expect(result.hasDrift).toBe(false);
    });
  });

  describe('detectPopulationDrift', () => {
    it('detects no drift for same distribution', () => {
      const dist = { LOW: 10, HIGH: 5, CRITICAL: 2 };
      const result = detectPopulationDrift(dist, dist, 0.1);
      expect(result.hasDrift).toBe(false);
      expect(result.driftType).toBe('POPULATION_DRIFT');
    });
    it('detects drift when distribution shifts significantly', () => {
      const baseline = { LOW: 100, HIGH: 10 };
      const current = { LOW: 10, HIGH: 100 };
      const result = detectPopulationDrift(baseline, current, 0.1);
      expect(result.hasDrift).toBe(true);
    });
    it('handles empty distributions', () => {
      const result = detectPopulationDrift({}, {}, 0.1);
      expect(result.hasDrift).toBe(false);
    });
  });

  describe('runAllDriftDetectors', () => {
    it('returns empty array when no drift detected', () => {
      const vals = [0.8, 0.81, 0.79, 0.82, 0.80, 0.81, 0.79, 0.82];
      const result = runAllDriftDetectors({
        baselineValues: vals,
        currentValues: vals,
        recentAccuracies: [0.8, 0.81, 0.79, 0.82],
        baselineFeatureStats: {},
        currentFeatureStats: {},
        baselinePopulation: {},
        currentPopulation: {},
        threshold: 0.15,
      });
      expect(result).toHaveLength(0);
    });
    it('returns drifted results only', () => {
      const result = runAllDriftDetectors({
        baselineValues: [0.8, 0.8, 0.8, 0.8],
        currentValues: [10, 10, 10, 10],
        recentAccuracies: [0.9, 0.9, 0.5, 0.5],
        baselineFeatureStats: {},
        currentFeatureStats: {},
        baselinePopulation: {},
        currentPopulation: {},
        threshold: 0.15,
      });
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((r) => r.hasDrift)).toBe(true);
    });
  });
});
