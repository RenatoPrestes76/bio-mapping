import { describe, it, expect } from '@jest/globals';
import {
  calculateConfidence,
  evidenceQualityScore,
  interpretConfidence,
  calculateDataQuality,
} from '../engine/confidence-calculator.js';

const FULL_INPUT = {
  examCount: 10,
  evidenceQuality: 1.0,
  clinicalConsistency: 1.0,
  biomarkerCount: 5,
  hasLongitudinalHistory: true,
  dataQuality: 1.0,
};

describe('calculateConfidence', () => {
  it('returns 1.00 for perfect input', () => {
    expect(calculateConfidence(FULL_INPUT)).toBe(1.0);
  });

  it('returns low value for empty input', () => {
    const result = calculateConfidence({
      examCount: 0, evidenceQuality: 0, clinicalConsistency: 0,
      biomarkerCount: 0, hasLongitudinalHistory: false, dataQuality: 0,
    });
    expect(result).toBe(0.0);
  });

  it('clamps evidenceQuality to 0-1 range', () => {
    const overshot = calculateConfidence({ ...FULL_INPUT, evidenceQuality: 2.0 });
    expect(overshot).toBeLessThanOrEqual(1.0);
  });

  it('returns value in 0.00-1.00 range', () => {
    const result = calculateConfidence({
      examCount: 3, evidenceQuality: 0.8, clinicalConsistency: 0.7,
      biomarkerCount: 2, hasLongitudinalHistory: false, dataQuality: 0.9,
    });
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('more exams = higher confidence', () => {
    const few = calculateConfidence({ ...FULL_INPUT, examCount: 1 });
    const many = calculateConfidence({ ...FULL_INPUT, examCount: 10 });
    expect(many).toBeGreaterThan(few);
  });

  it('longitudinal history increases confidence', () => {
    const without = calculateConfidence({ ...FULL_INPUT, hasLongitudinalHistory: false });
    const with_ = calculateConfidence({ ...FULL_INPUT, hasLongitudinalHistory: true });
    expect(with_).toBeGreaterThan(without);
  });

  it('caps examCount at 10', () => {
    const capped = calculateConfidence({ ...FULL_INPUT, examCount: 100 });
    const normal = calculateConfidence({ ...FULL_INPUT, examCount: 10 });
    expect(capped).toBe(normal);
  });

  it('returns two decimal precision', () => {
    const result = calculateConfidence({
      examCount: 3, evidenceQuality: 0.8, clinicalConsistency: 0.7,
      biomarkerCount: 2, hasLongitudinalHistory: true, dataQuality: 0.85,
    });
    expect(String(result).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
  });
});

describe('evidenceQualityScore', () => {
  it('A → 1.0', () => expect(evidenceQualityScore('A')).toBe(1.0));
  it('B → 0.8', () => expect(evidenceQualityScore('B')).toBe(0.8));
  it('C → 0.6', () => expect(evidenceQualityScore('C')).toBe(0.6));
  it('D → 0.4', () => expect(evidenceQualityScore('D')).toBe(0.4));
  it('EXPERT_OPINION → 0.3', () => expect(evidenceQualityScore('EXPERT_OPINION')).toBe(0.3));
  it('unknown → 0.5 default', () => expect(evidenceQualityScore('X')).toBe(0.5));
});

describe('interpretConfidence', () => {
  it('0.95 → Muito Alta', () => expect(interpretConfidence(0.95)).toBe('Muito Alta'));
  it('0.80 → Alta', () => expect(interpretConfidence(0.80)).toBe('Alta'));
  it('0.65 → Moderada', () => expect(interpretConfidence(0.65)).toBe('Moderada'));
  it('0.45 → Baixa', () => expect(interpretConfidence(0.45)).toBe('Baixa'));
  it('0.20 → Muito Baixa', () => expect(interpretConfidence(0.20)).toBe('Muito Baixa'));
});

describe('calculateDataQuality', () => {
  it('returns 1.0 when all variables have values', () => {
    expect(calculateDataQuality({ a: 1, b: 'x', c: true })).toBe(1.0);
  });

  it('returns 0.5 when half are null', () => {
    expect(calculateDataQuality({ a: 1, b: null })).toBe(0.5);
  });

  it('returns 0 for empty object', () => {
    expect(calculateDataQuality({})).toBe(0);
  });

  it('treats empty string as invalid', () => {
    expect(calculateDataQuality({ a: '' })).toBe(0);
  });
});
