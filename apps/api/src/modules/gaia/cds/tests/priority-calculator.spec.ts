import { describe, it, expect } from '@jest/globals';
import {
  determinePriority,
  getPriorityBand,
  calculatePriorityScore,
  requiresMedicalReview,
  PRIORITY_BANDS,
} from '../engine/priority-calculator.js';
import type { RuleMatchResult } from '../engine/rule-engine.js';

const makeRule = (priority: RuleMatchResult['priority']): RuleMatchResult => ({
  ruleId: 'r1', ruleName: 'Test', matched: true,
  priority, recommendation: 'Test', evidenceLevel: 'A', matchedConditions: [],
});

describe('determinePriority', () => {
  it('returns LOW for score 0', () => expect(determinePriority(0)).toBe('LOW'));
  it('returns LOW for score 24', () => expect(determinePriority(24)).toBe('LOW'));
  it('returns MODERATE for score 25', () => expect(determinePriority(25)).toBe('MODERATE'));
  it('returns MODERATE for score 49', () => expect(determinePriority(49)).toBe('MODERATE'));
  it('returns HIGH for score 50', () => expect(determinePriority(50)).toBe('HIGH'));
  it('returns HIGH for score 74', () => expect(determinePriority(74)).toBe('HIGH'));
  it('returns URGENT for score 75', () => expect(determinePriority(75)).toBe('URGENT'));
  it('returns URGENT for score 89', () => expect(determinePriority(89)).toBe('URGENT'));
  it('returns CRITICAL for score 90', () => expect(determinePriority(90)).toBe('CRITICAL'));
  it('returns CRITICAL for score 100', () => expect(determinePriority(100)).toBe('CRITICAL'));
  it('clamps above 100 to CRITICAL', () => expect(determinePriority(150)).toBe('CRITICAL'));
  it('clamps below 0 to LOW', () => expect(determinePriority(-10)).toBe('LOW'));
});

describe('getPriorityBand', () => {
  it('returns correct SLA for CRITICAL (1 hour)', () => {
    expect(getPriorityBand('CRITICAL').slaHours).toBe(1);
  });

  it('returns correct SLA for URGENT (4 hours)', () => {
    expect(getPriorityBand('URGENT').slaHours).toBe(4);
  });

  it('returns correct SLA for HIGH (48 hours)', () => {
    expect(getPriorityBand('HIGH').slaHours).toBe(48);
  });

  it('returns correct SLA for MODERATE (168 hours)', () => {
    expect(getPriorityBand('MODERATE').slaHours).toBe(168);
  });

  it('returns correct SLA for LOW (720 hours)', () => {
    expect(getPriorityBand('LOW').slaHours).toBe(720);
  });

  it('returns correct color for CRITICAL', () => {
    expect(getPriorityBand('CRITICAL').color).toBe('#7f1d1d');
  });
});

describe('PRIORITY_BANDS', () => {
  it('has 5 bands', () => expect(PRIORITY_BANDS).toHaveLength(5));
  it('covers full 0-100 range without gaps', () => {
    const sorted = [...PRIORITY_BANDS].sort((a, b) => a.minScore - b.minScore);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].minScore).toBe(sorted[i - 1].maxScore + 1);
    }
  });
});

describe('calculatePriorityScore', () => {
  it('returns 0 (base) when no rules match', () => {
    expect(calculatePriorityScore([])).toBe(0);
  });

  it('HIGH rule produces score in HIGH range (50-74)', () => {
    const score = calculatePriorityScore([makeRule('HIGH')]);
    expect(score).toBeGreaterThanOrEqual(50);
    expect(score).toBeLessThan(75);
  });

  it('CRITICAL rule produces score >= 90', () => {
    const score = calculatePriorityScore([makeRule('CRITICAL')]);
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it('multiple rules add bonus', () => {
    const single = calculatePriorityScore([makeRule('MODERATE')]);
    const multi = calculatePriorityScore([makeRule('MODERATE'), makeRule('MODERATE'), makeRule('MODERATE')]);
    expect(multi).toBeGreaterThan(single);
  });

  it('respects baseScore offset', () => {
    const withBase = calculatePriorityScore([], 15);
    expect(withBase).toBe(15);
  });
});

describe('requiresMedicalReview', () => {
  it('true for HIGH', () => expect(requiresMedicalReview('HIGH')).toBe(true));
  it('true for URGENT', () => expect(requiresMedicalReview('URGENT')).toBe(true));
  it('true for CRITICAL', () => expect(requiresMedicalReview('CRITICAL')).toBe(true));
  it('false for LOW', () => expect(requiresMedicalReview('LOW')).toBe(false));
  it('false for MODERATE', () => expect(requiresMedicalReview('MODERATE')).toBe(false));
});
