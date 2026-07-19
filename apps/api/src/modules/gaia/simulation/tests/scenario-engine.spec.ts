import { describe, it, expect } from '@jest/globals';
import {
  BUILT_IN_SCENARIOS,
  getScenarioTemplate,
  estimateConfidence,
  TIME_HORIZON_FACTOR,
  TIME_HORIZON_CONFIDENCE_PENALTY,
  TIME_HORIZON_LABEL,
  type ScenarioType,
  type TimeHorizon,
} from '../engine/scenario-engine.js';

describe('scenario-engine', () => {
  describe('BUILT_IN_SCENARIOS', () => {
    it('has at least 10 scenarios', () => {
      expect(BUILT_IN_SCENARIOS.length).toBeGreaterThanOrEqual(10);
    });

    it('each scenario has required fields', () => {
      for (const s of BUILT_IN_SCENARIOS) {
        expect(s.scenarioType).toBeTruthy();
        expect(s.name).toBeTruthy();
        expect(s.description).toBeTruthy();
        expect(typeof s.getEffect).toBe('function');
      }
    });

    it('each getEffect returns assumptions and limitations', () => {
      for (const s of BUILT_IN_SCENARIOS) {
        const effect = s.getEffect(s.defaultParameters);
        expect(Array.isArray(effect.assumptions)).toBe(true);
        expect(Array.isArray(effect.limitations)).toBe(true);
        expect(effect.assumptions.length).toBeGreaterThan(0);
      }
    });

    it('WEIGHT_LOSS applies negative bmiDelta', () => {
      const tpl = getScenarioTemplate('WEIGHT_LOSS')!;
      const effect = tpl.getEffect({ weightChangeKg: 10 });
      expect(effect.bmiDelta).toBeLessThan(0);
    });

    it('WEIGHT_GAIN applies positive bmiDelta', () => {
      const tpl = getScenarioTemplate('WEIGHT_GAIN')!;
      const effect = tpl.getEffect({ weightChangeKg: 5 });
      expect(effect.bmiDelta).toBeGreaterThan(0);
    });

    it('EXERCISE_INCREASE sets lifestyleOverride', () => {
      const tpl = getScenarioTemplate('EXERCISE_INCREASE')!;
      const effect = tpl.getEffect({});
      expect(effect.lifestyleOverride).toBeTruthy();
    });

    it('ALCOHOL_REDUCTION sets alcoholOverride', () => {
      const tpl = getScenarioTemplate('ALCOHOL_REDUCTION')!;
      const effect = tpl.getEffect({});
      expect(effect.alcoholOverride).toBeTruthy();
    });

    it('SMOKING_CESSATION sets smokingOverride to false', () => {
      const tpl = getScenarioTemplate('SMOKING_CESSATION')!;
      const effect = tpl.getEffect({});
      expect(effect.smokingOverride).toBe(false);
    });

    it('SMOKING_CESSATION has negative baseRiskAdjustment', () => {
      const tpl = getScenarioTemplate('SMOKING_CESSATION')!;
      const effect = tpl.getEffect({});
      expect(effect.baseRiskAdjustment).toBeLessThan(0);
    });

    it('TREATMENT_ADHERENCE has strongest direct risk reduction', () => {
      const tpl = getScenarioTemplate('TREATMENT_ADHERENCE')!;
      const effect = tpl.getEffect({});
      expect(effect.baseRiskAdjustment).toBeLessThanOrEqual(-0.07);
    });

    it('CUSTOM returns user-provided bmiDelta', () => {
      const tpl = getScenarioTemplate('CUSTOM')!;
      const effect = tpl.getEffect({ bmiDelta: -2.5 });
      expect(effect.bmiDelta).toBe(-2.5);
    });
  });

  describe('getScenarioTemplate', () => {
    it('returns template for known scenario', () => {
      expect(getScenarioTemplate('WEIGHT_LOSS')).not.toBeNull();
    });

    it('returns null for unknown scenario', () => {
      expect(getScenarioTemplate('UNKNOWN_SCENARIO' as ScenarioType)).toBeNull();
    });

    it('returns correct template for each known type', () => {
      const types: ScenarioType[] = ['WEIGHT_LOSS', 'WEIGHT_GAIN', 'EXERCISE_INCREASE', 'SMOKING_CESSATION'];
      for (const t of types) {
        expect(getScenarioTemplate(t)?.scenarioType).toBe(t);
      }
    });
  });

  describe('TIME_HORIZON_FACTOR', () => {
    it('DAYS_30 is less than YEAR_1', () => {
      expect(TIME_HORIZON_FACTOR.DAYS_30).toBeLessThan(TIME_HORIZON_FACTOR.YEAR_1);
    });

    it('YEAR_5 is maximum factor (1.0)', () => {
      expect(TIME_HORIZON_FACTOR.YEAR_5).toBe(1.0);
    });

    it('all factors are between 0 and 1', () => {
      for (const factor of Object.values(TIME_HORIZON_FACTOR)) {
        expect(factor).toBeGreaterThan(0);
        expect(factor).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('TIME_HORIZON_CONFIDENCE_PENALTY', () => {
    it('YEAR_5 has highest penalty', () => {
      expect(TIME_HORIZON_CONFIDENCE_PENALTY.YEAR_5).toBeGreaterThan(TIME_HORIZON_CONFIDENCE_PENALTY.DAYS_30);
    });

    it('all penalties are positive', () => {
      for (const penalty of Object.values(TIME_HORIZON_CONFIDENCE_PENALTY)) {
        expect(penalty).toBeGreaterThan(0);
      }
    });
  });

  describe('TIME_HORIZON_LABEL', () => {
    it('has label for each horizon', () => {
      const horizons: TimeHorizon[] = ['DAYS_30', 'DAYS_90', 'DAYS_180', 'YEAR_1', 'YEAR_2', 'YEAR_5'];
      for (const h of horizons) {
        expect(TIME_HORIZON_LABEL[h]).toBeTruthy();
      }
    });
  });

  describe('estimateConfidence', () => {
    it('returns value between 0.4 and 0.99', () => {
      const c = estimateConfidence(0.8, 'YEAR_1', false);
      expect(c).toBeGreaterThanOrEqual(0.4);
      expect(c).toBeLessThanOrEqual(0.99);
    });

    it('shorter horizon → higher confidence', () => {
      const short = estimateConfidence(0.8, 'DAYS_30', false);
      const long = estimateConfidence(0.8, 'YEAR_5', false);
      expect(short).toBeGreaterThan(long);
    });

    it('complete data → higher confidence', () => {
      const full = estimateConfidence(1.0, 'YEAR_1', false);
      const sparse = estimateConfidence(0.3, 'YEAR_1', false);
      expect(full).toBeGreaterThan(sparse);
    });

    it('missing critical data reduces confidence', () => {
      const withMissing = estimateConfidence(0.8, 'YEAR_1', true);
      const withoutMissing = estimateConfidence(0.8, 'YEAR_1', false);
      expect(withMissing).toBeLessThan(withoutMissing);
    });

    it('never returns below 0.4', () => {
      expect(estimateConfidence(0, 'YEAR_5', true)).toBeGreaterThanOrEqual(0.4);
    });
  });
});
