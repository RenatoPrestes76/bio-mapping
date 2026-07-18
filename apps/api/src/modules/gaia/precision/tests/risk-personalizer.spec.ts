import { describe, it, expect } from '@jest/globals';
import {
  adjustForFamilyHistory,
  adjustForLifestyle,
  adjustForTrend,
  classifyRiskLevel,
  calculatePersonalizedRisk,
} from '../engine/risk-personalizer.js';

describe('risk-personalizer', () => {
  describe('adjustForFamilyHistory', () => {
    it('returns 0 for empty family history', () => {
      expect(adjustForFamilyHistory(0.3, [])).toBe(0);
    });
    it('adds adjustment per high-risk condition', () => {
      expect(adjustForFamilyHistory(0.3, ['diabetes'])).toBeGreaterThan(0);
    });
    it('caps adjustment at 0.25 for many conditions', () => {
      const adj = adjustForFamilyHistory(0.3, ['diabetes', 'hypertension', 'cardiovascular', 'cancer', 'stroke']);
      expect(adj).toBeLessThanOrEqual(0.25);
    });
    it('returns 0 for non-high-risk conditions', () => {
      expect(adjustForFamilyHistory(0.3, ['hay_fever'])).toBe(0);
    });
    it('is case-insensitive', () => {
      expect(adjustForFamilyHistory(0.3, ['Diabetes'])).toBeGreaterThan(0);
    });
  });

  describe('adjustForLifestyle', () => {
    it('returns positive value for sedentary lifestyle', () => {
      expect(adjustForLifestyle('SEDENTARY')).toBeGreaterThan(0);
    });
    it('returns less adjustment for very active than sedentary', () => {
      expect(adjustForLifestyle('VERY_ACTIVE')).toBeLessThan(adjustForLifestyle('SEDENTARY'));
    });
    it('adds adjustment for smoking', () => {
      const noSmoke = adjustForLifestyle('SEDENTARY', false);
      const smoke = adjustForLifestyle('SEDENTARY', true);
      expect(smoke).toBeGreaterThan(noSmoke);
    });
    it('adds adjustment for heavy alcohol', () => {
      const none = adjustForLifestyle(undefined, false, 'NONE');
      const heavy = adjustForLifestyle(undefined, false, 'HEAVY');
      expect(heavy).toBeGreaterThan(none);
    });
    it('adds adjustment for high BMI', () => {
      const normal = adjustForLifestyle(undefined, false, 'NONE', 22);
      const obese = adjustForLifestyle(undefined, false, 'NONE', 35);
      expect(obese).toBeGreaterThan(normal);
    });
    it('returns 0 for no inputs', () => {
      expect(adjustForLifestyle()).toBe(0);
    });
  });

  describe('adjustForTrend', () => {
    it('returns 0 for undefined trend', () => {
      expect(adjustForTrend(undefined)).toBe(0);
    });
    it('returns positive for worsening trend', () => {
      expect(adjustForTrend(0.3)).toBeGreaterThan(0);
    });
    it('returns less adjustment for improving trend than worsening', () => {
      expect(adjustForTrend(-0.3)).toBeLessThan(adjustForTrend(0.3));
    });
    it('clamps at 0.15 max', () => {
      expect(adjustForTrend(100)).toBeLessThanOrEqual(0.15);
    });
    it('clamps at -0.10 min', () => {
      expect(adjustForTrend(-100)).toBeGreaterThanOrEqual(-0.10);
    });
  });

  describe('classifyRiskLevel', () => {
    it('classifies VERY_LOW for score < 0.10', () => {
      expect(classifyRiskLevel(0.05)).toBe('VERY_LOW');
    });
    it('classifies LOW for score 0.10–0.24', () => {
      expect(classifyRiskLevel(0.15)).toBe('LOW');
    });
    it('classifies MODERATE for score 0.25–0.49', () => {
      expect(classifyRiskLevel(0.35)).toBe('MODERATE');
    });
    it('classifies HIGH for score 0.50–0.74', () => {
      expect(classifyRiskLevel(0.60)).toBe('HIGH');
    });
    it('classifies VERY_HIGH for score >= 0.75', () => {
      expect(classifyRiskLevel(0.80)).toBe('VERY_HIGH');
    });
    it('handles boundary 0.10 as LOW', () => {
      expect(classifyRiskLevel(0.10)).toBe('LOW');
    });
    it('handles boundary 0.25 as MODERATE', () => {
      expect(classifyRiskLevel(0.25)).toBe('MODERATE');
    });
  });

  describe('calculatePersonalizedRisk', () => {
    it('returns all required fields', () => {
      const result = calculatePersonalizedRisk({ baseRiskScore: 0.3, familyHistory: ['diabetes'], lifestyle: 'SEDENTARY', smoking: true });
      expect(result).toHaveProperty('baseRiskScore');
      expect(result).toHaveProperty('familyHistoryAdj');
      expect(result).toHaveProperty('lifestyleAdj');
      expect(result).toHaveProperty('trendAdj');
      expect(result).toHaveProperty('finalRiskScore');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('factors');
    });
    it('finalRiskScore is clamped 0–1', () => {
      const result = calculatePersonalizedRisk({ baseRiskScore: 0.9, familyHistory: ['diabetes', 'hypertension', 'cardiovascular'], smoking: true, alcohol: 'HEAVY' });
      expect(result.finalRiskScore).toBeLessThanOrEqual(1);
      expect(result.finalRiskScore).toBeGreaterThanOrEqual(0);
    });
    it('finalRiskScore is higher than base for high-risk profile', () => {
      const result = calculatePersonalizedRisk({ baseRiskScore: 0.3, familyHistory: ['diabetes'], smoking: true });
      expect(result.finalRiskScore).toBeGreaterThan(0.3);
    });
    it('factors array is populated for risk profile', () => {
      const result = calculatePersonalizedRisk({ baseRiskScore: 0.3, familyHistory: ['diabetes'], smoking: true });
      expect(result.factors.length).toBeGreaterThan(0);
    });
    it('factors array is empty for clean profile', () => {
      const result = calculatePersonalizedRisk({ baseRiskScore: 0.3, familyHistory: [], smoking: false, alcohol: 'NONE', lifestyle: 'VERY_ACTIVE' });
      const hasWorsening = result.factors.some((f) => f.includes('+'));
      expect(hasWorsening).toBe(false);
    });
    it('athlete lifestyle reduces final risk score', () => {
      const sedentary = calculatePersonalizedRisk({ baseRiskScore: 0.3, lifestyle: 'SEDENTARY' });
      const athlete = calculatePersonalizedRisk({ baseRiskScore: 0.3, lifestyle: 'ATHLETE' });
      expect(athlete.finalRiskScore).toBeLessThan(sedentary.finalRiskScore);
    });
  });
});
