import { describe, it, expect } from '@jest/globals';
import {
  classifyRiskTrend,
  buildComparisonEntry,
  rankComparisonEntries,
  compareSimulations,
  computeRelativeImpact,
  type SimulationComparisonEntry,
} from '../engine/comparison-engine.js';

const makeEntry = (runId: string, variation: number, trend: 'REDUCTION' | 'STABLE' | 'INCREASE' = 'STABLE'): SimulationComparisonEntry => ({
  runId,
  scenarioLabel: `Cenário ${runId}`,
  timeHorizonLabel: '1 ano',
  baselineRiskScore: 0.5,
  simulatedRiskScore: 0.5 + variation / 100,
  expectedRiskVariation: variation,
  expectedRiskVariationPercent: variation / 0.5,
  confidence: 0.8,
  riskTrend: trend,
  baselineRiskLevel: 'MODERATE',
  simulatedRiskLevel: 'MODERATE',
});

const baseResult = {
  scenarioLabel: 'Cessação do tabagismo',
  timeHorizonLabel: '1 ano',
  baselineRiskScore: 0.55,
  simulatedRiskScore: 0.45,
  expectedRiskVariation: -10,
  expectedRiskVariationPercent: -18.2,
  confidence: 0.82,
  baselineRiskLevel: 'HIGH',
  simulatedRiskLevel: 'MODERATE',
};

describe('comparison-engine', () => {
  describe('classifyRiskTrend', () => {
    it('returns REDUCTION for variation <= -2', () => {
      expect(classifyRiskTrend(-2)).toBe('REDUCTION');
      expect(classifyRiskTrend(-10)).toBe('REDUCTION');
    });

    it('returns INCREASE for variation >= 2', () => {
      expect(classifyRiskTrend(2)).toBe('INCREASE');
      expect(classifyRiskTrend(5)).toBe('INCREASE');
    });

    it('returns STABLE for variation between -2 and 2', () => {
      expect(classifyRiskTrend(0)).toBe('STABLE');
      expect(classifyRiskTrend(1)).toBe('STABLE');
      expect(classifyRiskTrend(-1)).toBe('STABLE');
    });

    it('boundary: exactly -2 is REDUCTION', () => {
      expect(classifyRiskTrend(-2)).toBe('REDUCTION');
    });

    it('boundary: exactly 2 is INCREASE', () => {
      expect(classifyRiskTrend(2)).toBe('INCREASE');
    });

    it('returns STABLE for 0', () => {
      expect(classifyRiskTrend(0)).toBe('STABLE');
    });
  });

  describe('buildComparisonEntry', () => {
    it('includes runId and all result fields', () => {
      const entry = buildComparisonEntry('run-1', baseResult);
      expect(entry.runId).toBe('run-1');
      expect(entry.scenarioLabel).toBe('Cessação do tabagismo');
      expect(entry.baselineRiskScore).toBe(0.55);
      expect(entry.simulatedRiskScore).toBe(0.45);
      expect(entry.expectedRiskVariation).toBe(-10);
      expect(entry.confidence).toBe(0.82);
    });

    it('sets riskTrend based on variation', () => {
      const entry = buildComparisonEntry('run-1', baseResult);
      expect(entry.riskTrend).toBe('REDUCTION');
    });

    it('INCREASE trend for positive variation', () => {
      const entry = buildComparisonEntry('run-2', { ...baseResult, expectedRiskVariation: 5 });
      expect(entry.riskTrend).toBe('INCREASE');
    });

    it('STABLE trend for near-zero variation', () => {
      const entry = buildComparisonEntry('run-3', { ...baseResult, expectedRiskVariation: 0.5 });
      expect(entry.riskTrend).toBe('STABLE');
    });
  });

  describe('rankComparisonEntries', () => {
    it('sorts entries by expectedRiskVariation ascending', () => {
      const entries = [
        makeEntry('r1', 5, 'INCREASE'),
        makeEntry('r2', -10, 'REDUCTION'),
        makeEntry('r3', 0, 'STABLE'),
      ];
      const ranked = rankComparisonEntries(entries);
      expect(ranked[0].expectedRiskVariation).toBeLessThan(ranked[1].expectedRiskVariation);
      expect(ranked[1].expectedRiskVariation).toBeLessThan(ranked[2].expectedRiskVariation);
    });

    it('does not mutate original array', () => {
      const entries = [makeEntry('r1', 5, 'INCREASE'), makeEntry('r2', -10, 'REDUCTION')];
      const original = [...entries];
      rankComparisonEntries(entries);
      expect(entries[0].runId).toBe(original[0].runId);
    });

    it('returns new array', () => {
      const entries = [makeEntry('r1', 5, 'INCREASE')];
      expect(rankComparisonEntries(entries)).not.toBe(entries);
    });
  });

  describe('compareSimulations', () => {
    it('returns empty result for no entries', () => {
      const result = compareSimulations([]);
      expect(result.entries).toHaveLength(0);
      expect(result.bestScenario).toBeNull();
      expect(result.worstScenario).toBeNull();
      expect(result.averageVariation).toBe(0);
    });

    it('identifies bestScenario as the one with greatest reduction', () => {
      const entries = [
        makeEntry('r1', -10, 'REDUCTION'),
        makeEntry('r2', -5, 'REDUCTION'),
      ];
      const result = compareSimulations(entries);
      expect(result.bestScenario).toContain('r1');
    });

    it('bestScenario is null when no entry has negative variation', () => {
      const entries = [makeEntry('r1', 3, 'INCREASE'), makeEntry('r2', 5, 'INCREASE')];
      const result = compareSimulations(entries);
      expect(result.bestScenario).toBeNull();
    });

    it('identifies worstScenario as greatest increase', () => {
      const entries = [
        makeEntry('r1', -10, 'REDUCTION'),
        makeEntry('r2', 8, 'INCREASE'),
      ];
      const result = compareSimulations(entries);
      expect(result.worstScenario).toContain('r2');
    });

    it('worstScenario is null when all variations are reductions', () => {
      const entries = [makeEntry('r1', -5, 'REDUCTION'), makeEntry('r2', -3, 'REDUCTION')];
      const result = compareSimulations(entries);
      expect(result.worstScenario).toBeNull();
    });

    it('computes correct average variation', () => {
      const entries = [makeEntry('r1', -10, 'REDUCTION'), makeEntry('r2', 4, 'INCREASE')];
      const result = compareSimulations(entries);
      expect(result.averageVariation).toBeCloseTo((-10 + 4) / 2, 1);
    });

    it('entries are sorted ascending by variation', () => {
      const entries = [makeEntry('r1', 5, 'INCREASE'), makeEntry('r2', -8, 'REDUCTION'), makeEntry('r3', 0, 'STABLE')];
      const result = compareSimulations(entries);
      expect(result.entries[0].expectedRiskVariation).toBeLessThan(result.entries[1].expectedRiskVariation);
    });

    it('summary mentions number of reduction scenarios', () => {
      const entries = [makeEntry('r1', -5, 'REDUCTION'), makeEntry('r2', -3, 'REDUCTION')];
      expect(compareSimulations(entries).summary).toContain('2');
    });
  });

  describe('computeRelativeImpact', () => {
    it('assigns rank 1 to best (lowest variation) entry', () => {
      const entries = [makeEntry('r1', 5, 'INCREASE'), makeEntry('r2', -10, 'REDUCTION')];
      const impact = computeRelativeImpact(entries);
      const best = impact.find((e) => e.relativeRank === 1)!;
      expect(best.riskTrend).toBe('REDUCTION');
    });

    it('returns one entry per input', () => {
      const entries = [makeEntry('r1', 0, 'STABLE'), makeEntry('r2', 5, 'INCREASE'), makeEntry('r3', -5, 'REDUCTION')];
      expect(computeRelativeImpact(entries)).toHaveLength(3);
    });

    it('each entry has scenarioLabel, relativeRank, and riskTrend', () => {
      const entries = [makeEntry('r1', -5, 'REDUCTION')];
      const impact = computeRelativeImpact(entries);
      expect(impact[0]).toHaveProperty('scenarioLabel');
      expect(impact[0]).toHaveProperty('relativeRank');
      expect(impact[0]).toHaveProperty('riskTrend');
    });
  });
});
