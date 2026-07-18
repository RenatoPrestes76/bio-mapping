import { describe, it, expect } from '@jest/globals';
import {
  evaluateCondition,
  evaluatePersonalizationRule,
  applyPersonalizationRules,
  generateRecommendations,
  BUILT_IN_TEMPLATES,
  type PersonalizationRuleDef,
  type ProfileSnapshot,
} from '../engine/recommendation-personalizer.js';

const diabetesRiskProfile: ProfileSnapshot = {
  age: 50,
  sex: 'MALE',
  bmi: 29,
  lifestyle: 'SEDENTARY',
  smoking: false,
  alcohol: 'NONE',
  familyHistory: ['diabetes', 'hypertension'],
  conditions: [],
};

const healthyProfile: ProfileSnapshot = {
  age: 30,
  bmi: 22,
  lifestyle: 'VERY_ACTIVE',
  smoking: false,
  alcohol: 'NONE',
  familyHistory: [],
};

describe('recommendation-personalizer', () => {
  describe('BUILT_IN_TEMPLATES', () => {
    it('has at least 8 templates', () => {
      expect(BUILT_IN_TEMPLATES.length).toBeGreaterThanOrEqual(8);
    });
    it('each template has required fields', () => {
      for (const tpl of BUILT_IN_TEMPLATES) {
        expect(tpl.id).toBeTruthy();
        expect(tpl.category).toBeTruthy();
        expect(tpl.priority).toBeTruthy();
        expect(tpl.title).toBeTruthy();
        expect(typeof tpl.condition).toBe('function');
        expect(typeof tpl.reason).toBe('function');
      }
    });
  });

  describe('evaluateCondition', () => {
    it('evaluates gt correctly', () => {
      expect(evaluateCondition({ variable: 'age', operator: 'gt', value: 40 }, { age: 50 })).toBe(true);
      expect(evaluateCondition({ variable: 'age', operator: 'gt', value: 60 }, { age: 50 })).toBe(false);
    });
    it('evaluates lt correctly', () => {
      expect(evaluateCondition({ variable: 'bmi', operator: 'lt', value: 25 }, { bmi: 22 })).toBe(true);
    });
    it('evaluates eq correctly', () => {
      expect(evaluateCondition({ variable: 'smoking', operator: 'eq', value: true }, { smoking: true })).toBe(true);
    });
    it('evaluates includes on array', () => {
      expect(evaluateCondition({ variable: 'familyHistory', operator: 'includes', value: 'diabetes' }, { familyHistory: ['diabetes'] })).toBe(true);
    });
    it('evaluates not_includes on array', () => {
      expect(evaluateCondition({ variable: 'familyHistory', operator: 'not_includes', value: 'diabetes' }, { familyHistory: ['hay_fever'] })).toBe(true);
    });
    it('returns false for unknown variable', () => {
      expect(evaluateCondition({ variable: 'unknownVar', operator: 'gt', value: 0 }, {})).toBe(false);
    });
  });

  describe('evaluatePersonalizationRule', () => {
    const rule: PersonalizationRuleDef = {
      id: 'r1', name: 'Test', conditions: [
        { variable: 'age', operator: 'gt', value: 40 },
        { variable: 'bmi', operator: 'gte', value: 25 },
      ],
      conjunction: 'AND', action: 'INCREASE_MONITORING',
    };
    it('returns true when all AND conditions match', () => {
      expect(evaluatePersonalizationRule(rule, { age: 50, bmi: 28 })).toBe(true);
    });
    it('returns false when one AND condition fails', () => {
      expect(evaluatePersonalizationRule(rule, { age: 50, bmi: 22 })).toBe(false);
    });
    it('returns true when any OR condition matches', () => {
      const orRule: PersonalizationRuleDef = { ...rule, conjunction: 'OR' };
      expect(evaluatePersonalizationRule(orRule, { age: 50, bmi: 22 })).toBe(true);
    });
  });

  describe('applyPersonalizationRules', () => {
    const rules: PersonalizationRuleDef[] = [
      { id: 'r1', name: 'Elderly + overweight', conditions: [{ variable: 'age', operator: 'gte', value: 65 }, { variable: 'bmi', operator: 'gte', value: 25 }], conjunction: 'AND', action: 'INCREASE_MONITORING' },
      { id: 'r2', name: 'Smoker', conditions: [{ variable: 'smoking', operator: 'eq', value: true }], conjunction: 'AND', action: 'SMOKING_CESSATION' },
    ];
    it('returns matching rules', () => {
      const matched = applyPersonalizationRules(rules, { age: 70, bmi: 27, smoking: false });
      expect(matched).toHaveLength(1);
      expect(matched[0].id).toBe('r1');
    });
    it('returns empty array when nothing matches', () => {
      expect(applyPersonalizationRules(rules, { age: 30, bmi: 22, smoking: false })).toHaveLength(0);
    });
  });

  describe('generateRecommendations', () => {
    it('generates recommendations for high-risk profile', () => {
      const recs = generateRecommendations(diabetesRiskProfile);
      expect(recs.length).toBeGreaterThan(0);
    });
    it('each recommendation has required fields', () => {
      const recs = generateRecommendations(diabetesRiskProfile);
      for (const r of recs) {
        expect(r.category).toBeTruthy();
        expect(r.priority).toBeTruthy();
        expect(r.title).toBeTruthy();
        expect(r.description).toBeTruthy();
        expect(r.reason).toBeTruthy();
        expect(r.personalized).toBe(true);
      }
    });
    it('recommends exercise for sedentary profile', () => {
      const recs = generateRecommendations({ lifestyle: 'SEDENTARY' });
      expect(recs.some((r) => r.category === 'EXERCISE')).toBe(true);
    });
    it('recommends smoking cessation for smoker', () => {
      const recs = generateRecommendations({ smoking: true });
      expect(recs.some((r) => r.category === 'LIFESTYLE')).toBe(true);
    });
    it('recommends nutrition for diabetes family history', () => {
      const recs = generateRecommendations({ familyHistory: ['diabetes'] });
      expect(recs.some((r) => r.category === 'NUTRITION')).toBe(true);
    });
    it('sorted by priority (URGENT first)', () => {
      const recs = generateRecommendations({ smoking: true, lifestyle: 'SEDENTARY', familyHistory: ['diabetes'] });
      const priorities = recs.map((r) => r.priority);
      const urgentIdx = priorities.indexOf('URGENT');
      const lowIdx = priorities.indexOf('LOW');
      if (urgentIdx >= 0 && lowIdx >= 0) expect(urgentIdx).toBeLessThan(lowIdx);
    });
    it('generates fewer recommendations for healthy profile', () => {
      const risky = generateRecommendations(diabetesRiskProfile);
      const healthy = generateRecommendations(healthyProfile);
      expect(risky.length).toBeGreaterThanOrEqual(healthy.length);
    });
    it('recommends specialist referral for HIGH risk', () => {
      const recs = generateRecommendations({ riskLevel: 'HIGH' });
      expect(recs.some((r) => r.category === 'SPECIALIST_REFERRAL')).toBe(true);
    });
  });
});
