import { describe, it, expect } from '@jest/globals';
import {
  adaptReferenceRange,
  classifyBiomarkerStatus,
  isWithinRange,
  findMatchingRange,
  DEFAULT_REFERENCE_RANGES,
} from '../engine/reference-range-adapter.js';

describe('reference-range-adapter', () => {
  describe('DEFAULT_REFERENCE_RANGES', () => {
    it('has at least 10 built-in ranges', () => {
      expect(DEFAULT_REFERENCE_RANGES.length).toBeGreaterThanOrEqual(10);
    });
    it('includes glucose range', () => {
      expect(DEFAULT_REFERENCE_RANGES.some((r) => r.biomarker === 'glucose')).toBe(true);
    });
    it('includes hba1c range', () => {
      expect(DEFAULT_REFERENCE_RANGES.some((r) => r.biomarker === 'hba1c')).toBe(true);
    });
    it('has sex-specific HDL ranges', () => {
      const hdlRanges = DEFAULT_REFERENCE_RANGES.filter((r) => r.biomarker === 'hdl');
      expect(hdlRanges.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('findMatchingRange', () => {
    it('finds glucose range without context', () => {
      const range = findMatchingRange('glucose', {});
      expect(range).not.toBeNull();
      expect(range!.biomarker).toBe('glucose');
    });
    it('prefers sex-specific HDL for female', () => {
      const range = findMatchingRange('hdl', { sex: 'FEMALE' });
      expect(range!.sex).toBe('FEMALE');
      expect(range!.lowerBound).toBe(50);
    });
    it('prefers sex-specific HDL for male', () => {
      const range = findMatchingRange('hdl', { sex: 'MALE' });
      expect(range!.sex).toBe('MALE');
      expect(range!.lowerBound).toBe(40);
    });
    it('returns null for unknown biomarker', () => {
      expect(findMatchingRange('unknown_biomarker', {})).toBeNull();
    });
    it('is case-insensitive', () => {
      expect(findMatchingRange('Glucose', {})).not.toBeNull();
    });
  });

  describe('adaptReferenceRange', () => {
    it('returns range for known biomarker', () => {
      const range = adaptReferenceRange('glucose', {});
      expect(range).not.toBeNull();
      expect(range!.biomarker).toBe('glucose');
    });
    it('returns null for unknown biomarker', () => {
      expect(adaptReferenceRange('xyzUnknown', {})).toBeNull();
    });
    it('marks source as BUILT_IN for default ranges', () => {
      const range = adaptReferenceRange('glucose', {});
      expect(range!.source).toBe('BUILT_IN');
    });
    it('marks source as CUSTOM when custom range provided', () => {
      const custom = [{ biomarker: 'glucose', lowerBound: 60, upperBound: 110, unit: 'mg/dL' }];
      const range = adaptReferenceRange('glucose', {}, custom);
      expect(range!.source).toBe('CUSTOM');
    });
    it('adds sex to contextApplied for sex-specific range', () => {
      const range = adaptReferenceRange('hdl', { sex: 'FEMALE' });
      expect(range!.contextApplied.some((c) => c.includes('FEMALE'))).toBe(true);
    });
    it('adds gestation to contextApplied when pregnant', () => {
      const range = adaptReferenceRange('glucose', { pregnant: true });
      expect(range!.contextApplied).toContain('gestação');
    });
  });

  describe('classifyBiomarkerStatus', () => {
    const glucoseRange = adaptReferenceRange('glucose', {})!;
    it('classifies LOW when below lower bound', () => {
      expect(classifyBiomarkerStatus(60, glucoseRange)).toBe('LOW');
    });
    it('classifies NORMAL within bounds', () => {
      expect(classifyBiomarkerStatus(85, glucoseRange)).toBe('NORMAL');
    });
    it('classifies HIGH when above upper bound', () => {
      expect(classifyBiomarkerStatus(120, glucoseRange)).toBe('HIGH');
    });
    it('classifies UNKNOWN when range is null', () => {
      expect(classifyBiomarkerStatus(100, null)).toBe('UNKNOWN');
    });
    it('boundary: lower bound is NORMAL', () => {
      expect(classifyBiomarkerStatus(70, glucoseRange)).toBe('NORMAL');
    });
    it('boundary: upper bound is NORMAL', () => {
      expect(classifyBiomarkerStatus(99, glucoseRange)).toBe('NORMAL');
    });
  });

  describe('isWithinRange', () => {
    const bmiRange = adaptReferenceRange('bmi', {})!;
    it('returns true for normal BMI', () => {
      expect(isWithinRange(22, bmiRange)).toBe(true);
    });
    it('returns false for overweight BMI', () => {
      expect(isWithinRange(27, bmiRange)).toBe(false);
    });
    it('returns false when range is null', () => {
      expect(isWithinRange(22, null)).toBe(false);
    });
  });
});
