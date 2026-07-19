import { describe, it, expect } from '@jest/globals';
import {
  computeBenchmarkEntry,
  compareCohortMetrics,
  rankByAbsoluteDiff,
  buildBenchmarkReport,
} from '../engine/benchmark-engine.js';

describe('benchmark-engine', () => {
  describe('computeBenchmarkEntry', () => {
    it('computes difference A - B', () => {
      const entry = computeBenchmarkEntry('bmi', 'IMC', 28, 25);
      expect(entry.difference).toBe(3);
    });

    it('computes percentDiff correctly', () => {
      const entry = computeBenchmarkEntry('bmi', 'IMC', 30, 25);
      expect(entry.percentDiff).toBeCloseTo(20, 1);
    });

    it('difference is null when valueB is null', () => {
      const entry = computeBenchmarkEntry('bmi', 'IMC', 28, null);
      expect(entry.difference).toBeNull();
      expect(entry.percentDiff).toBeNull();
    });

    it('percentDiff is null when valueB is 0', () => {
      const entry = computeBenchmarkEntry('x', 'X', 5, 0);
      expect(entry.percentDiff).toBeNull();
    });

    it('includes all fields', () => {
      const entry = computeBenchmarkEntry('bmi', 'IMC', 28, 25, 'kg/m²');
      expect(entry.key).toBe('bmi');
      expect(entry.label).toBe('IMC');
      expect(entry.valueA).toBe(28);
      expect(entry.valueB).toBe(25);
      expect(entry.unit).toBe('kg/m²');
    });
  });

  describe('compareCohortMetrics', () => {
    it('creates one entry per unique key', () => {
      const a = { bmi: 28, hba1c: 6.5 };
      const b = { bmi: 25, hba1c: 5.8 };
      const entries = compareCohortMetrics(a, b);
      expect(entries).toHaveLength(2);
    });

    it('includes keys only in A with valueB null', () => {
      const a = { bmi: 28, age: 45 };
      const b = { bmi: 25 };
      const entries = compareCohortMetrics(a, b);
      const ageEntry = entries.find((e) => e.key === 'age')!;
      expect(ageEntry.valueB).toBeNull();
    });

    it('uses label from labels map when provided', () => {
      const entries = compareCohortMetrics({ bmi: 28 }, { bmi: 25 }, { bmi: 'Índice de Massa Corporal' });
      expect(entries[0].label).toBe('Índice de Massa Corporal');
    });
  });

  describe('rankByAbsoluteDiff', () => {
    it('sorts by absolute percentDiff descending', () => {
      const entries = [
        computeBenchmarkEntry('a', 'A', 10, 9),
        computeBenchmarkEntry('b', 'B', 30, 10),
        computeBenchmarkEntry('c', 'C', 20, 15),
      ];
      const ranked = rankByAbsoluteDiff(entries);
      expect(Math.abs(ranked[0].percentDiff!)).toBeGreaterThanOrEqual(Math.abs(ranked[1].percentDiff!));
    });

    it('does not mutate original array', () => {
      const entries = [computeBenchmarkEntry('a', 'A', 10, 5), computeBenchmarkEntry('b', 'B', 20, 8)];
      const orig = [...entries];
      rankByAbsoluteDiff(entries);
      expect(entries[0].key).toBe(orig[0].key);
    });
  });

  describe('buildBenchmarkReport', () => {
    it('returns entries, sizes, and computedAt', () => {
      const report = buildBenchmarkReport({ bmi: 28 }, { bmi: 25 }, 100, 80);
      expect(report.entries).toBeDefined();
      expect(report.cohortASize).toBe(100);
      expect(report.cohortBSize).toBe(80);
      expect(report.computedAt).toBeInstanceOf(Date);
    });

    it('topDifference is the entry with highest absolute percentDiff', () => {
      const report = buildBenchmarkReport({ bmi: 30, age: 45 }, { bmi: 20, age: 44 }, 100, 100);
      expect(report.topDifference).not.toBeNull();
      expect(report.topDifference!.key).toBe('bmi');
    });

    it('topDifference is null for empty metrics', () => {
      const report = buildBenchmarkReport({}, {}, 10, 10);
      expect(report.topDifference).toBeNull();
    });
  });
});
