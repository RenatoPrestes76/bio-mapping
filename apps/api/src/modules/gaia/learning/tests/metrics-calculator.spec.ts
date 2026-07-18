import { describe, it, expect } from '@jest/globals';
import {
  calculateAccuracy,
  calculatePrecision,
  calculateRecall,
  calculateSpecificity,
  calculateSensitivity,
  calculateF1Score,
  calculateMetrics,
  buildConfusionMatrix,
  estimateRocAuc,
  calculateECE,
  metricsFromOutcomes,
  type ConfusionMatrix,
  type PredictionSample,
} from '../engine/metrics-calculator.js';

const perfectMatrix: ConfusionMatrix = { tp: 50, tn: 50, fp: 0, fn: 0 };
const halfMatrix: ConfusionMatrix = { tp: 25, tn: 25, fp: 25, fn: 25 };
const emptyMatrix: ConfusionMatrix = { tp: 0, tn: 0, fp: 0, fn: 0 };

describe('metrics-calculator', () => {
  describe('calculateAccuracy', () => {
    it('returns 1 for perfect matrix', () => {
      expect(calculateAccuracy(perfectMatrix)).toBe(1);
    });
    it('returns 0.5 for half correct matrix', () => {
      expect(calculateAccuracy(halfMatrix)).toBe(0.5);
    });
    it('returns 0 for empty matrix', () => {
      expect(calculateAccuracy(emptyMatrix)).toBe(0);
    });
    it('calculates correctly for mixed matrix', () => {
      expect(calculateAccuracy({ tp: 40, tn: 40, fp: 10, fn: 10 })).toBe(0.8);
    });
  });

  describe('calculatePrecision', () => {
    it('returns 1 for perfect matrix', () => {
      expect(calculatePrecision(perfectMatrix)).toBe(1);
    });
    it('returns 0 when no positives predicted', () => {
      expect(calculatePrecision({ tp: 0, tn: 50, fp: 0, fn: 50 })).toBe(0);
    });
    it('calculates correctly', () => {
      expect(calculatePrecision({ tp: 30, tn: 20, fp: 10, fn: 40 })).toBe(0.75);
    });
  });

  describe('calculateRecall', () => {
    it('returns 1 for perfect matrix', () => {
      expect(calculateRecall(perfectMatrix)).toBe(1);
    });
    it('returns 0 when no actual positives', () => {
      expect(calculateRecall({ tp: 0, tn: 50, fp: 50, fn: 0 })).toBe(0);
    });
    it('calculates correctly', () => {
      expect(calculateRecall({ tp: 30, tn: 20, fp: 10, fn: 10 })).toBe(0.75);
    });
  });

  describe('calculateSpecificity', () => {
    it('returns 1 for perfect matrix', () => {
      expect(calculateSpecificity(perfectMatrix)).toBe(1);
    });
    it('returns 0 when all negatives misclassified', () => {
      expect(calculateSpecificity({ tp: 50, tn: 0, fp: 50, fn: 0 })).toBe(0);
    });
    it('calculates correctly', () => {
      expect(calculateSpecificity({ tp: 30, tn: 40, fp: 10, fn: 20 })).toBe(0.8);
    });
  });

  describe('calculateSensitivity', () => {
    it('equals recall', () => {
      expect(calculateSensitivity(halfMatrix)).toBe(calculateRecall(halfMatrix));
    });
  });

  describe('calculateF1Score', () => {
    it('returns 1 for perfect matrix', () => {
      expect(calculateF1Score(perfectMatrix)).toBe(1);
    });
    it('returns 0 for empty matrix', () => {
      expect(calculateF1Score(emptyMatrix)).toBe(0);
    });
    it('returns harmonic mean of precision and recall', () => {
      const m: ConfusionMatrix = { tp: 30, tn: 20, fp: 10, fn: 10 };
      const p = calculatePrecision(m);
      const r = calculateRecall(m);
      const expected = Math.round((2 * p * r) / (p + r) * 100) / 100;
      expect(calculateF1Score(m)).toBe(expected);
    });
  });

  describe('buildConfusionMatrix', () => {
    it('builds correct matrix from samples', () => {
      const samples: PredictionSample[] = [
        { predicted: true, actual: true },
        { predicted: false, actual: false },
        { predicted: true, actual: false },
        { predicted: false, actual: true },
      ];
      const m = buildConfusionMatrix(samples);
      expect(m).toEqual({ tp: 1, tn: 1, fp: 1, fn: 1 });
    });
    it('handles all true positives', () => {
      const samples: PredictionSample[] = Array(5).fill({ predicted: true, actual: true });
      const m = buildConfusionMatrix(samples);
      expect(m.tp).toBe(5);
      expect(m.fp + m.fn + m.tn).toBe(0);
    });
    it('handles empty samples', () => {
      const m = buildConfusionMatrix([]);
      expect(m).toEqual({ tp: 0, tn: 0, fp: 0, fn: 0 });
    });
  });

  describe('estimateRocAuc', () => {
    it('returns 0.5 for empty samples', () => {
      expect(estimateRocAuc([])).toBe(0.5);
    });
    it('returns 0.5 when all same class', () => {
      const samples: PredictionSample[] = Array(5).fill({ predicted: true, actual: true, confidence: 0.9 });
      expect(estimateRocAuc(samples)).toBe(0.5);
    });
    it('returns high AUC for good predictions', () => {
      const samples: PredictionSample[] = [
        { predicted: true, actual: true, confidence: 0.9 },
        { predicted: true, actual: true, confidence: 0.85 },
        { predicted: false, actual: false, confidence: 0.2 },
        { predicted: false, actual: false, confidence: 0.15 },
      ];
      expect(estimateRocAuc(samples)).toBeGreaterThan(0.7);
    });
  });

  describe('calculateECE', () => {
    it('returns 0 for empty bins', () => {
      expect(calculateECE([])).toBe(0);
    });
    it('returns 0 for perfectly calibrated bins', () => {
      const bins = [
        { avgConfidence: 0.9, accuracy: 0.9, count: 10 },
        { avgConfidence: 0.5, accuracy: 0.5, count: 10 },
      ];
      expect(calculateECE(bins)).toBe(0);
    });
    it('returns positive error for miscalibrated bins', () => {
      const bins = [{ avgConfidence: 0.9, accuracy: 0.5, count: 10 }];
      expect(calculateECE(bins)).toBeGreaterThan(0);
    });
  });

  describe('calculateMetrics', () => {
    it('returns all metric keys', () => {
      const result = calculateMetrics(perfectMatrix);
      expect(result).toHaveProperty('accuracy');
      expect(result).toHaveProperty('precision');
      expect(result).toHaveProperty('recall');
      expect(result).toHaveProperty('specificity');
      expect(result).toHaveProperty('sensitivity');
      expect(result).toHaveProperty('f1Score');
      expect(result).toHaveProperty('rocAuc');
      expect(result).toHaveProperty('calibration');
    });
    it('all metrics are 0-1', () => {
      const result = calculateMetrics(halfMatrix);
      for (const val of Object.values(result)) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('metricsFromOutcomes', () => {
    it('high priority + worsened = tp (both true)', () => {
      const s = metricsFromOutcomes('CRITICAL', 'WORSENED');
      expect(s.predicted).toBe(true);
      expect(s.actual).toBe(true);
    });
    it('low priority + improved = tn (both false)', () => {
      const s = metricsFromOutcomes('LOW', 'IMPROVED');
      expect(s.predicted).toBe(false);
      expect(s.actual).toBe(false);
    });
    it('high priority + improved = fp', () => {
      const s = metricsFromOutcomes('HIGH', 'IMPROVED');
      expect(s.predicted).toBe(true);
      expect(s.actual).toBe(false);
    });
    it('low priority + hospitalized = fn', () => {
      const s = metricsFromOutcomes('LOW', 'HOSPITALIZED');
      expect(s.predicted).toBe(false);
      expect(s.actual).toBe(true);
    });
  });
});
