import { ClinicalKnowledge, DecisionPriority, DecisionType, EvidenceLevel, KnowledgeStatus, ClinicalKnowledgeCategory } from '@bio/database';
import { HypertensionUncontrolledRule } from '../rules/hypertension-uncontrolled.rule.js';
import { DiabetesHighRiskRule } from '../rules/diabetes-high-risk.rule.js';
import { SevereObesityRule } from '../rules/severe-obesity.rule.js';
import { DyslipidemiaRule } from '../rules/dyslipidemia.rule.js';
import { MetabolicSyndromeRule } from '../rules/metabolic-syndrome.rule.js';

const makeKnowledge = (clinicalCode: string, id = 'kb-1'): ClinicalKnowledge => ({
  id,
  tenantId: null,
  category: ClinicalKnowledgeCategory.DISEASE,
  title: 'Test',
  description: null,
  clinicalCode,
  source: null,
  evidenceLevel: EvidenceLevel.A,
  language: 'pt-BR',
  version: 1,
  status: KnowledgeStatus.PUBLISHED,
  tags: [],
  metadata: null,
  createdBy: null,
  updatedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('HypertensionUncontrolledRule', () => {
  const rule = new HypertensionUncontrolledRule();

  it('has correct ruleId and type', () => {
    expect(rule.ruleId).toBe('HYPERTENSION_UNCONTROLLED');
    expect(rule.decisionType).toBe(DecisionType.ALERT);
    expect(rule.priority).toBe(DecisionPriority.CRITICAL);
  });

  it('supports() returns true when bp_systolic is present', () => {
    expect(rule.supports({ bp_systolic: 160 })).toBe(true);
  });

  it('supports() returns false when no BP fields present', () => {
    expect(rule.supports({ bmi: 30 })).toBe(false);
  });

  it('triggers on systolic ≥ 160', async () => {
    const result = await rule.evaluate({ bp_systolic: 170, bp_diastolic: 90 }, [makeKnowledge('I10')]);
    expect(result?.triggered).toBe(true);
    expect(result?.knowledgeId).toBe('kb-1');
    expect(result?.evidenceLevel).toBe(EvidenceLevel.A);
  });

  it('triggers on diastolic ≥ 100', async () => {
    const result = await rule.evaluate({ bp_systolic: 140, bp_diastolic: 105 }, []);
    expect(result?.triggered).toBe(true);
  });

  it('does not trigger on controlled hypertension (< 160/100)', async () => {
    const result = await rule.evaluate({ bp_systolic: 140, bp_diastolic: 90 }, []);
    expect(result).toBeNull();
  });

  it('does not trigger on normal BP', async () => {
    const result = await rule.evaluate({ bp_systolic: 120, bp_diastolic: 80 }, []);
    expect(result).toBeNull();
  });
});

describe('DiabetesHighRiskRule', () => {
  const rule = new DiabetesHighRiskRule();

  it('has correct ruleId', () => {
    expect(rule.ruleId).toBe('DIABETES_HIGH_RISK');
    expect(rule.decisionType).toBe(DecisionType.ALERT);
    expect(rule.priority).toBe(DecisionPriority.HIGH);
  });

  it('supports() true when glucose is present', () => {
    expect(rule.supports({ glucose: 200 })).toBe(true);
  });

  it('triggers on glucose ≥ 180', async () => {
    const result = await rule.evaluate({ glucose: 200 }, [makeKnowledge('E11')]);
    expect(result?.triggered).toBe(true);
    expect(result?.knowledgeId).toBe('kb-1');
  });

  it('triggers on HbA1c ≥ 8%', async () => {
    const result = await rule.evaluate({ hba1c: 8.5 }, []);
    expect(result?.triggered).toBe(true);
  });

  it('includes both metrics in description when both are elevated', async () => {
    const result = await rule.evaluate({ glucose: 220, hba1c: 9.0 }, []);
    expect(result?.description).toContain('glicemia');
    expect(result?.description).toContain('HbA1c');
  });

  it('does not trigger on controlled glucose', async () => {
    const result = await rule.evaluate({ glucose: 110, hba1c: 6.5 }, []);
    expect(result).toBeNull();
  });
});

describe('SevereObesityRule', () => {
  const rule = new SevereObesityRule();

  it('has correct ruleId', () => {
    expect(rule.ruleId).toBe('SEVERE_OBESITY');
    expect(rule.decisionType).toBe(DecisionType.RECOMMENDATION);
  });

  it('supports() true when bmi is present', () => {
    expect(rule.supports({ bmi: 35 })).toBe(true);
  });

  it('triggers on BMI ≥ 35', async () => {
    const result = await rule.evaluate({ bmi: 36 }, [makeKnowledge('E66')]);
    expect(result?.triggered).toBe(true);
    expect(result?.knowledgeId).toBe('kb-1');
  });

  it('marks as morbid obesity when BMI ≥ 40', async () => {
    const result = await rule.evaluate({ bmi: 42 }, []);
    expect(result?.title).toContain('Grau III');
  });

  it('does not trigger on BMI < 35', async () => {
    const result = await rule.evaluate({ bmi: 34 }, []);
    expect(result).toBeNull();
  });
});

describe('DyslipidemiaRule', () => {
  const rule = new DyslipidemiaRule();

  it('has correct ruleId', () => {
    expect(rule.ruleId).toBe('DYSLIPIDEMIA_SIGNIFICANT');
    expect(rule.decisionType).toBe(DecisionType.ALERT);
  });

  it('supports() true when ldl is present', () => {
    expect(rule.supports({ ldl: 200 })).toBe(true);
  });

  it('triggers on LDL ≥ 190', async () => {
    const result = await rule.evaluate({ ldl: 200 }, [makeKnowledge('E78')]);
    expect(result?.triggered).toBe(true);
    expect(result?.knowledgeId).toBe('kb-1');
  });

  it('triggers on triglycerides ≥ 500 with pancreatitis warning', async () => {
    const result = await rule.evaluate({ triglycerides: 600 }, []);
    expect(result?.triggered).toBe(true);
    expect(result?.recommendation).toContain('pancreatite');
  });

  it('does not trigger on acceptable lipids', async () => {
    const result = await rule.evaluate({ ldl: 130, triglycerides: 150 }, []);
    expect(result).toBeNull();
  });
});

describe('MetabolicSyndromeRule', () => {
  const rule = new MetabolicSyndromeRule();

  it('has correct ruleId', () => {
    expect(rule.ruleId).toBe('METABOLIC_SYNDROME');
    expect(rule.decisionType).toBe(DecisionType.CARE_GAP);
    expect(rule.priority).toBe(DecisionPriority.MEDIUM);
  });

  it('supports() true when any relevant field present', () => {
    expect(rule.supports({ triglycerides: 160 })).toBe(true);
  });

  it('triggers when 3 or more criteria met', async () => {
    const result = await rule.evaluate(
      { waist: 106, triglycerides: 160, hdl: 35, bp_systolic: 135, glucose: 105 },
      [makeKnowledge('E88.8')],
    );
    expect(result?.triggered).toBe(true);
    expect(result?.knowledgeId).toBe('kb-1');
  });

  it('description mentions number of criteria', async () => {
    const result = await rule.evaluate(
      { waist: 106, triglycerides: 160, hdl: 35, bp_systolic: 135, glucose: 105 },
      [],
    );
    expect(result?.description).toMatch(/5 de 5/);
  });

  it('does not trigger with fewer than 3 criteria', async () => {
    const result = await rule.evaluate({ waist: 106, triglycerides: 160 }, []);
    expect(result).toBeNull();
  });

  it('does not trigger with no criteria', async () => {
    const result = await rule.evaluate({ bmi: 28 }, []);
    expect(result).toBeNull();
  });
});
