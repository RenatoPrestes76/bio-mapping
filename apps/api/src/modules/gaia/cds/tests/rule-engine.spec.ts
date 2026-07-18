import { describe, it, expect } from '@jest/globals';
import {
  evaluateCondition,
  evaluateRule,
  applyRules,
  DEFAULT_RULES,
  type CdsRuleDefinition,
  type ClinicalVariables,
} from '../engine/rule-engine.js';

const DIABETES_RULE: CdsRuleDefinition = {
  id: 'test-001',
  name: 'Diabetes Test',
  conditions: [
    { variable: 'hba1c', operator: 'gte', value: 6.5 },
    { variable: 'bmi', operator: 'gte', value: 30 },
  ],
  conjunction: 'AND',
  priority: 'HIGH',
  recommendation: 'Avaliação médica.',
  evidenceLevel: 'A',
};

const OR_RULE: CdsRuleDefinition = {
  ...DIABETES_RULE,
  id: 'test-002',
  conjunction: 'OR',
  conditions: [
    { variable: 'hba1c', operator: 'gte', value: 6.5 },
    { variable: 'glucose', operator: 'lt', value: 54 },
  ],
};

describe('evaluateCondition', () => {
  it('gt: true when variable > value', () => {
    expect(evaluateCondition({ variable: 'bmi', operator: 'gt', value: 25 }, { bmi: 30 })).toBe(true);
  });

  it('gt: false when variable === value', () => {
    expect(evaluateCondition({ variable: 'bmi', operator: 'gt', value: 30 }, { bmi: 30 })).toBe(false);
  });

  it('gte: true when variable === value', () => {
    expect(evaluateCondition({ variable: 'bmi', operator: 'gte', value: 30 }, { bmi: 30 })).toBe(true);
  });

  it('lt: true when variable < value', () => {
    expect(evaluateCondition({ variable: 'glucose', operator: 'lt', value: 54 }, { glucose: 50 })).toBe(true);
  });

  it('lt: false when variable === value', () => {
    expect(evaluateCondition({ variable: 'glucose', operator: 'lt', value: 54 }, { glucose: 54 })).toBe(false);
  });

  it('lte: true when variable === value', () => {
    expect(evaluateCondition({ variable: 'val', operator: 'lte', value: 5 }, { val: 5 })).toBe(true);
  });

  it('eq: true for string equality', () => {
    expect(evaluateCondition({ variable: 'gender', operator: 'eq', value: 'male' }, { gender: 'male' })).toBe(true);
  });

  it('neq: true when values differ', () => {
    expect(evaluateCondition({ variable: 'status', operator: 'neq', value: 'active' }, { status: 'inactive' })).toBe(true);
  });

  it('contains: true for substring match (case-insensitive)', () => {
    expect(evaluateCondition({ variable: 'note', operator: 'contains', value: 'diabetes' }, { note: 'Pre-diabetes diagnosis' })).toBe(true);
  });

  it('returns false when variable is undefined', () => {
    expect(evaluateCondition({ variable: 'hba1c', operator: 'gt', value: 6 }, {})).toBe(false);
  });
});

describe('evaluateRule', () => {
  it('AND: matches when all conditions true', () => {
    const vars: ClinicalVariables = { hba1c: 7.0, bmi: 32 };
    const result = evaluateRule(DIABETES_RULE, vars);
    expect(result.matched).toBe(true);
    expect(result.ruleId).toBe('test-001');
  });

  it('AND: does not match when one condition false', () => {
    const vars: ClinicalVariables = { hba1c: 7.0, bmi: 24 };
    const result = evaluateRule(DIABETES_RULE, vars);
    expect(result.matched).toBe(false);
    expect(result.matchedConditions).toHaveLength(0);
  });

  it('OR: matches when only first condition is true', () => {
    const vars: ClinicalVariables = { hba1c: 6.5, glucose: 80 };
    const result = evaluateRule(OR_RULE, vars);
    expect(result.matched).toBe(true);
  });

  it('OR: matches when only second condition is true', () => {
    const vars: ClinicalVariables = { hba1c: 5.0, glucose: 40 };
    const result = evaluateRule(OR_RULE, vars);
    expect(result.matched).toBe(true);
  });

  it('OR: does not match when all conditions false', () => {
    const vars: ClinicalVariables = { hba1c: 5.0, glucose: 80 };
    const result = evaluateRule(OR_RULE, vars);
    expect(result.matched).toBe(false);
  });

  it('returns recommendation and evidenceLevel on match', () => {
    const result = evaluateRule(DIABETES_RULE, { hba1c: 7.0, bmi: 32 });
    expect(result.recommendation).toBe('Avaliação médica.');
    expect(result.evidenceLevel).toBe('A');
  });
});

describe('applyRules', () => {
  it('returns only matched rules', () => {
    const vars: ClinicalVariables = { hba1c: 7.0, bmi: 32 };
    const results = applyRules([DIABETES_RULE, OR_RULE], vars);
    expect(results.every((r) => r.matched)).toBe(true);
  });

  it('returns empty array when nothing matches', () => {
    const vars: ClinicalVariables = { hba1c: 5.0, bmi: 20 };
    const results = applyRules([DIABETES_RULE], vars);
    expect(results).toHaveLength(0);
  });

  it('applies DEFAULT_RULES: builtin-001 triggers for diabetes variables', () => {
    const vars: ClinicalVariables = { hba1c: 7.0, bmi: 33 };
    const results = applyRules(DEFAULT_RULES, vars);
    expect(results.some((r) => r.ruleId === 'builtin-001')).toBe(true);
  });

  it('applies DEFAULT_RULES: builtin-006 triggers for severe hypoglycemia', () => {
    const vars: ClinicalVariables = { glucose: 45 };
    const results = applyRules(DEFAULT_RULES, vars);
    expect(results.some((r) => r.ruleId === 'builtin-006')).toBe(true);
    expect(results.find((r) => r.ruleId === 'builtin-006')?.priority).toBe('CRITICAL');
  });

  it('applies DEFAULT_RULES: builtin-003 triggers for stage 2 hypertension', () => {
    const vars: ClinicalVariables = { systolicBp: 165 };
    const results = applyRules(DEFAULT_RULES, vars);
    expect(results.some((r) => r.ruleId === 'builtin-003')).toBe(true);
  });
});

describe('DEFAULT_RULES', () => {
  it('has 8 built-in rules', () => {
    expect(DEFAULT_RULES).toHaveLength(8);
  });

  it('all have required fields', () => {
    for (const rule of DEFAULT_RULES) {
      expect(rule.id).toBeTruthy();
      expect(rule.name).toBeTruthy();
      expect(rule.conditions.length).toBeGreaterThan(0);
      expect(rule.priority).toBeTruthy();
      expect(rule.recommendation).toBeTruthy();
    }
  });
});
