import { ClinicalCase, Sex } from '../entities/clinical-case.entity.js';
import { ReasoningContext, NormalizedCaseData } from '../engine/reasoning-context.js';
import { RuleBasedStrategy } from '../strategies/rule-based.strategy.js';
import { EvidenceStrategy } from '../strategies/evidence.strategy.js';
import { OntologyStrategy } from '../strategies/ontology.strategy.js';
import { PredictionStrategy } from '../strategies/prediction.strategy.js';
import { RiskStrategy } from '../strategies/risk.strategy.js';
import { HybridStrategy } from '../strategies/hybrid.strategy.js';

const makeNormalized = (): NormalizedCaseData => ({
  riskScore: 0.3,
  hasCardiovascularRisk: false,
  hasMetabolicRisk: false,
  hasEndocrineRisk: false,
  abnormalBiomarkers: [],
  criticalBiomarkers: [],
});

const makeContext = (overrides: Partial<ConstructorParameters<typeof ClinicalCase>[0]> = {}): ReasoningContext => {
  const c = new ClinicalCase({ age: 45, sex: Sex.MALE, ...overrides });
  return new ReasoningContext(c, makeNormalized());
};

describe('RuleBasedStrategy', () => {
  const strategy = new RuleBasedStrategy();

  it('has name RULE_BASED and weight 1.0', () => {
    expect(strategy.name).toBe('RULE_BASED');
    expect(strategy.weight).toBe(1.0);
  });

  it('matches hypertension rule when systolic_bp >= 140', () => {
    const ctx = makeContext({ biomarkers: [{ name: 'systolic_bp', value: 150 }] });
    const output = strategy.apply(ctx);
    const hyp = output.candidates.find((c) => c.condition === 'Hipertensão Arterial');
    expect(hyp).toBeDefined();
    expect(hyp!.rawProbability).toBeGreaterThan(0.5);
  });

  it('matches diabetes rule when fasting_glucose >= 126', () => {
    const ctx = makeContext({ biomarkers: [{ name: 'fasting_glucose', value: 130 }] });
    const output = strategy.apply(ctx);
    const hyp = output.candidates.find((c) => c.condition === 'Diabetes Mellitus tipo 2');
    expect(hyp).toBeDefined();
  });

  it('matches dyslipidemia when ldl >= 160', () => {
    const ctx = makeContext({ biomarkers: [{ name: 'ldl', value: 180 }] });
    const output = strategy.apply(ctx);
    const hyp = output.candidates.find((c) => c.condition === 'Dislipidemia');
    expect(hyp).toBeDefined();
  });

  it('matches obesity when bmi >= 30', () => {
    const ctx = makeContext({ biomarkers: [{ name: 'bmi', value: 32 }] });
    const output = strategy.apply(ctx);
    const hyp = output.candidates.find((c) => c.condition === 'Obesidade');
    expect(hyp).toBeDefined();
  });

  it('returns empty candidates for active healthy case', () => {
    const ctx = makeContext({ lifestyle: { physicalActivity: 'VIGOROUS', smoking: false } });
    const output = strategy.apply(ctx);
    expect(output.candidates).toEqual([]);
  });

  it('returns 1 reasoning step', () => {
    const ctx = makeContext();
    const output = strategy.apply(ctx);
    expect(output.steps).toHaveLength(1);
  });

  it('clamped probability does not exceed 1', () => {
    const ctx = makeContext({
      biomarkers: [
        { name: 'fasting_glucose', value: 400 },
        { name: 'hba1c', value: 12 },
      ],
      symptoms: ['poliúria', 'polidipsia', 'fadiga'],
      conditions: ['diabetes'],
    });
    const output = strategy.apply(ctx);
    for (const c of output.candidates) {
      expect(c.rawProbability).toBeLessThanOrEqual(1);
    }
  });
});

describe('EvidenceStrategy', () => {
  const strategy = new EvidenceStrategy();

  it('has name EVIDENCE', () => {
    expect(strategy.name).toBe('EVIDENCE');
  });

  it('boosts confidence for matching conditions already in context', () => {
    const ctx = makeContext();
    ctx.addCandidates([{
      condition: 'Diabetes Mellitus tipo 2',
      rawProbability: 0.7,
      rawConfidence: 0.8,
      supportingEvidence: [],
      contradictingEvidence: [],
      recommendedActions: [],
      strategyName: 'RULE_BASED',
    }]);
    const output = strategy.apply(ctx);
    const boost = output.candidates.find((c) => c.condition === 'Diabetes Mellitus tipo 2');
    expect(boost).toBeDefined();
    expect(boost!.rawConfidence).toBeGreaterThan(0);
  });

  it('does not add boost for unknown conditions', () => {
    const ctx = makeContext();
    ctx.addCandidates([{
      condition: 'Condição Desconhecida',
      rawProbability: 0.5,
      rawConfidence: 0.7,
      supportingEvidence: [],
      contradictingEvidence: [],
      recommendedActions: [],
      strategyName: 'RULE_BASED',
    }]);
    const output = strategy.apply(ctx);
    expect(output.candidates).toHaveLength(0);
  });
});

describe('OntologyStrategy', () => {
  const strategy = new OntologyStrategy();

  it('has name ONTOLOGY', () => {
    expect(strategy.name).toBe('ONTOLOGY');
  });

  it('expands Diabetes to related conditions', () => {
    const ctx = makeContext();
    ctx.addCandidates([{
      condition: 'Diabetes Mellitus tipo 2',
      rawProbability: 0.7,
      rawConfidence: 0.8,
      supportingEvidence: [],
      contradictingEvidence: [],
      recommendedActions: [],
      strategyName: 'RULE_BASED',
    }]);
    const output = strategy.apply(ctx);
    const conditions = output.candidates.map((c) => c.condition);
    expect(conditions.some((c) => ['Dislipidemia', 'Hipertensão Arterial', 'Síndrome Metabólica'].includes(c))).toBe(true);
  });

  it('does not duplicate already existing conditions', () => {
    const ctx = makeContext();
    ctx.addCandidates([
      { condition: 'Diabetes Mellitus tipo 2', rawProbability: 0.7, rawConfidence: 0.8, supportingEvidence: [], contradictingEvidence: [], recommendedActions: [], strategyName: 'RULE_BASED' },
      { condition: 'Dislipidemia', rawProbability: 0.6, rawConfidence: 0.75, supportingEvidence: [], contradictingEvidence: [], recommendedActions: [], strategyName: 'RULE_BASED' },
    ]);
    const output = strategy.apply(ctx);
    const conditions = output.candidates.map((c) => c.condition);
    expect(conditions.filter((c) => c === 'Dislipidemia')).toHaveLength(0);
  });

  it('derived candidates have confidence 0.55', () => {
    const ctx = makeContext();
    ctx.addCandidates([{ condition: 'Obesidade', rawProbability: 0.8, rawConfidence: 0.9, supportingEvidence: [], contradictingEvidence: [], recommendedActions: [], strategyName: 'RULE_BASED' }]);
    const output = strategy.apply(ctx);
    for (const c of output.candidates) {
      expect(c.rawConfidence).toBe(0.55);
    }
  });
});

describe('PredictionStrategy', () => {
  const strategy = new PredictionStrategy();

  it('has name PREDICTION', () => {
    expect(strategy.name).toBe('PREDICTION');
  });

  it('generates CVD candidate for high-risk profile', () => {
    const ctx = makeContext({
      age: 60,
      lifestyle: { smoking: true },
      conditions: ['diabetes', 'hipertensão'],
      biomarkers: [{ name: 'ldl', value: 200 }],
    });
    const output = strategy.apply(ctx);
    const cvd = output.candidates.find((c) => c.condition === 'Alto Risco Cardiovascular');
    expect(cvd).toBeDefined();
  });

  it('generates metabolic candidate for multi-criteria match', () => {
    const ctx = makeContext({
      biomarkers: [
        { name: 'bmi', value: 32 },
        { name: 'fasting_glucose', value: 105 },
        { name: 'triglycerides', value: 160 },
        { name: 'hdl', value: 38 },
        { name: 'systolic_bp', value: 135 },
      ],
      lifestyle: { physicalActivity: 'SEDENTARY' },
    });
    const output = strategy.apply(ctx);
    const metab = output.candidates.find((c) => c.condition === 'Síndrome Metabólica');
    expect(metab).toBeDefined();
  });

  it('returns a reasoning step', () => {
    const ctx = makeContext();
    const output = strategy.apply(ctx);
    expect(output.steps).toHaveLength(1);
  });
});

describe('RiskStrategy', () => {
  const strategy = new RiskStrategy();

  it('has name RISK', () => {
    expect(strategy.name).toBe('RISK');
  });

  it('generates CRITICAL alert for glucose >= 400', () => {
    const ctx = makeContext({ biomarkers: [{ name: 'fasting_glucose', value: 420 }] });
    strategy.apply(ctx);
    const alerts = ctx.getMeta<unknown[]>('riskAlerts') ?? [];
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('generates polypharmacy alert for elderly with >= 5 medications', () => {
    const ctx = makeContext({ age: 70, medications: ['a', 'b', 'c', 'd', 'e'] });
    strategy.apply(ctx);
    const alerts = ctx.getMeta<Array<{ condition: string }>>('riskAlerts') ?? [];
    expect(alerts.some((a) => a.condition === 'Polifarmácia')).toBe(true);
  });

  it('generates emergency candidate when critical biomarker present', () => {
    const ctx = makeContext({ biomarkers: [{ name: 'systolic_bp', value: 190 }] });
    const output = strategy.apply(ctx);
    const emergency = output.candidates.find((c) => c.condition === 'Emergência Metabólica');
    expect(emergency).toBeDefined();
    expect(emergency!.rawProbability).toBeGreaterThan(0.7);
  });
});

describe('HybridStrategy', () => {
  const strategy = new HybridStrategy();

  it('has name HYBRID and weight 1.0', () => {
    expect(strategy.name).toBe('HYBRID');
    expect(strategy.weight).toBe(1.0);
  });

  it('merges duplicates into single candidate', () => {
    const ctx = makeContext();
    ctx.addCandidates([
      { condition: 'Dislipidemia', rawProbability: 0.6, rawConfidence: 0.8, supportingEvidence: ['a'], contradictingEvidence: [], recommendedActions: ['rec1'], strategyName: 'RULE_BASED' },
      { condition: 'Dislipidemia', rawProbability: 0.1, rawConfidence: 0.5, supportingEvidence: ['b'], contradictingEvidence: [], recommendedActions: ['rec2'], strategyName: 'EVIDENCE' },
    ]);
    const output = strategy.apply(ctx);
    const dyslipidemia = output.candidates.filter((c) => c.condition === 'Dislipidemia');
    expect(dyslipidemia).toHaveLength(1);
  });

  it('merged probability is boosted above base', () => {
    const ctx = makeContext();
    ctx.addCandidates([
      { condition: 'Dislipidemia', rawProbability: 0.6, rawConfidence: 0.8, supportingEvidence: [], contradictingEvidence: [], recommendedActions: [], strategyName: 'RULE_BASED' },
      { condition: 'Dislipidemia', rawProbability: 0.3, rawConfidence: 0.6, supportingEvidence: [], contradictingEvidence: [], recommendedActions: [], strategyName: 'EVIDENCE' },
    ]);
    const output = strategy.apply(ctx);
    const merged = output.candidates.find((c) => c.condition === 'Dislipidemia')!;
    expect(merged.rawProbability).toBeGreaterThan(0.6);
  });

  it('output is sorted by probability descending', () => {
    const ctx = makeContext();
    ctx.addCandidates([
      { condition: 'A', rawProbability: 0.3, rawConfidence: 0.7, supportingEvidence: [], contradictingEvidence: [], recommendedActions: [], strategyName: 'RULE_BASED' },
      { condition: 'B', rawProbability: 0.8, rawConfidence: 0.9, supportingEvidence: [], contradictingEvidence: [], recommendedActions: [], strategyName: 'RULE_BASED' },
    ]);
    const output = strategy.apply(ctx);
    expect(output.candidates[0].rawProbability).toBeGreaterThanOrEqual(output.candidates[1].rawProbability);
  });

  it('returns empty when context has no candidates', () => {
    const ctx = makeContext();
    const output = strategy.apply(ctx);
    expect(output.candidates).toHaveLength(0);
  });
});
