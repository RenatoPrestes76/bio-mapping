import { describe, it, expect } from '@jest/globals';
import {
  MINIMUM_COHORT_SIZE,
  shouldSuppress,
  pseudonymizeId,
  applyAggregationMinimum,
  sanitizeCohortResult,
  computeAgeRange,
  roundToPrivacyBucket,
  pseudonymizeList,
} from '../engine/privacy-layer.js';

describe('privacy-layer', () => {
  describe('shouldSuppress', () => {
    it('returns true when below minimum', () => {
      expect(shouldSuppress(MINIMUM_COHORT_SIZE - 1)).toBe(true);
    });

    it('returns false when at minimum', () => {
      expect(shouldSuppress(MINIMUM_COHORT_SIZE)).toBe(false);
    });

    it('returns false when above minimum', () => {
      expect(shouldSuppress(100)).toBe(false);
    });
  });

  describe('pseudonymizeId', () => {
    it('returns a string starting with anon_', () => {
      expect(pseudonymizeId('patient-123', 'salt')).toMatch(/^anon_[0-9a-f]+$/);
    });

    it('is deterministic for same inputs', () => {
      expect(pseudonymizeId('p1', 'salt')).toBe(pseudonymizeId('p1', 'salt'));
    });

    it('produces different output for different patientIds', () => {
      expect(pseudonymizeId('p1', 'salt')).not.toBe(pseudonymizeId('p2', 'salt'));
    });

    it('produces different output for different salts', () => {
      expect(pseudonymizeId('p1', 'salt1')).not.toBe(pseudonymizeId('p1', 'salt2'));
    });
  });

  describe('applyAggregationMinimum', () => {
    it('returns null when cohort below minimum', () => {
      expect(applyAggregationMinimum(42.5, 5)).toBeNull();
    });

    it('returns value when cohort above minimum', () => {
      expect(applyAggregationMinimum(42.5, 50)).toBe(42.5);
    });
  });

  describe('sanitizeCohortResult', () => {
    it('returns suppression object for small cohorts', () => {
      const result = sanitizeCohortResult({ patientId: 'p1', value: 42 }, 5);
      expect((result as any).suppressed).toBe(true);
    });

    it('removes patientId from result', () => {
      const result = sanitizeCohortResult({ patientId: 'p1', value: 42, name: 'Test' }, 20) as any;
      expect(result.patientId).toBeUndefined();
    });

    it('retains non-identifying fields', () => {
      const result = sanitizeCohortResult({ patientId: 'p1', value: 42, name: 'Test' }, 20) as any;
      expect(result.value).toBe(42);
      expect(result.name).toBe('Test');
    });

    it('suppression message mentions LGPD', () => {
      const result = sanitizeCohortResult({ patientId: 'p1' }, 3) as any;
      expect(result.reason).toContain('LGPD');
    });
  });

  describe('computeAgeRange', () => {
    it('returns null when below minimum cohort size', () => {
      expect(computeAgeRange([25, 30, 35])).toBeNull();
    });

    it('returns min, max, mean for sufficient data', () => {
      const ages = Array.from({ length: 20 }, (_, i) => 30 + i);
      const result = computeAgeRange(ages)!;
      expect(result.min).toBe(30);
      expect(result.max).toBe(49);
      expect(result.mean).toBeCloseTo(39.5, 1);
    });
  });

  describe('roundToPrivacyBucket', () => {
    it('rounds to nearest bucket of 5', () => {
      expect(roundToPrivacyBucket(47, 5)).toBe(45);
    });

    it('rounds up at midpoint', () => {
      expect(roundToPrivacyBucket(52.5, 5)).toBe(55);
    });
  });

  describe('pseudonymizeList', () => {
    it('returns same length as input', () => {
      const ids = ['p1', 'p2', 'p3'];
      expect(pseudonymizeList(ids, 'salt')).toHaveLength(3);
    });

    it('all outputs are anon_ prefixed', () => {
      const result = pseudonymizeList(['p1', 'p2'], 'salt');
      for (const id of result) {
        expect(id).toMatch(/^anon_/);
      }
    });

    it('all outputs are distinct', () => {
      const result = pseudonymizeList(['p1', 'p2', 'p3'], 'salt');
      expect(new Set(result).size).toBe(3);
    });
  });
});
