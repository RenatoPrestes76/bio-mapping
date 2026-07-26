import { DecisionContext } from '../entities/decision-context.entity.js';
import { DecisionAggregationEngine } from '../engines/decision-aggregation.engine.js';
import { DecisionRankingEngine } from '../engines/decision-ranking.engine.js';
import { AlertGenerationEngine } from '../engines/alert-generation.engine.js';
import { ContraindicationEngine } from '../engines/contraindication.engine.js';
import { EvidenceLinkEngine } from '../engines/evidence-link.engine.js';
import { RecommendationConflictResolverEngine } from '../engines/recommendation-conflict-resolver.engine.js';
import { DecisionExplanationEngine } from '../engines/decision-explanation.engine.js';
import type { ClinicalRecommendationItem } from '../entities/clinical-decision.entity.js';
import { Contraindication } from '../entities/contraindication.entity.js';

const makeContext = (overrides: Partial<ConstructorParameters<typeof DecisionContext>[0]> = {}) =>
  new DecisionContext({
    patientId: 'p1',
    demographics: { age: 60, sex: 'FEMALE', bmi: 32 },
    conditions: ['diabetes', 'hypertension'],
    biomarkers: [
      { marker: 'hba1c', value: 9.5, unit: '%' },
      { marker: 'bp_systolic', value: 165, unit: 'mmHg' },
      { marker: 'egfr', value: 58, unit: 'mL/min' },
    ],
    medications: [
      { name: 'metformin', isCurrent: true },
      { name: 'lisinopril', isCurrent: true },
      { name: 'warfarin', isCurrent: true },
      { name: 'aspirin', isCurrent: true },
    ],
    allergies: ['sulfa'],
    ...overrides,
  });

const makeRec = (action: string, urgency: ClinicalRecommendationItem['urgency'] = 'ROUTINE'): ClinicalRecommendationItem => ({
  id: `rec-${Math.random().toString(36).slice(2)}`,
  category: 'MEDICATION',
  action,
  rationale: 'test',
  urgency,
  confidenceContribution: 70,
  sourceModule: 'test',
  evidenceLevel: 'A',
});

describe('DecisionAggregationEngine', () => {
  const engine = new DecisionAggregationEngine();
  const ctx = makeContext();

  it('aggregates recommendations from multiple modules', () => {
    const results = [
      engine.buildModuleResult('ModA', [makeRec('recommend aspirin'), makeRec('recommend statin')], [], 100),
      engine.buildModuleResult('ModB', [makeRec('recommend metformin')], [], 80),
    ];
    const output = engine.aggregate(results, ctx);
    expect(output.recommendations).toHaveLength(3);
    expect(output.modulesWithData).toContain('ModA');
    expect(output.modulesWithData).toContain('ModB');
  });

  it('deduplicates by action', () => {
    const results = [
      engine.buildModuleResult('ModA', [makeRec('recommend aspirin')], [], 100),
      engine.buildModuleResult('ModB', [makeRec('recommend aspirin')], [], 100),
    ];
    const output = engine.aggregate(results, ctx);
    expect(output.recommendations).toHaveLength(1);
  });

  it('skips modules with no data', () => {
    const results = [
      engine.buildModuleResult('ModA', [], [], 0),
      engine.buildModuleResult('ModB', [makeRec('x')], [], 100),
    ];
    const output = engine.aggregate(results, ctx);
    expect(output.modulesWithData).not.toContain('ModA');
    expect(output.modulesWithData).toContain('ModB');
  });

  it('returns zero completeness for empty results', () => {
    const output = engine.aggregate([], ctx);
    expect(output.totalDataCompleteness).toBe(0);
  });
});

describe('DecisionRankingEngine', () => {
  const engine = new DecisionRankingEngine();

  it('rankRecommendations sorts IMMEDIATE first', () => {
    const recs = [
      makeRec('routine check', 'ROUTINE'),
      makeRec('urgent action', 'IMMEDIATE'),
      makeRec('short term follow-up', 'SHORT_TERM'),
    ];
    const ranked = engine.rankRecommendations(recs);
    expect(ranked[0].recommendation.urgency).toBe('IMMEDIATE');
  });

  it('getTopN returns only N items', () => {
    const recs = Array.from({ length: 5 }, (_, i) => makeRec(`action ${i}`));
    expect(engine.getTopN(recs, 3)).toHaveLength(3);
  });

  it('getCriticalFirst puts IMMEDIATE before SHORT_TERM before rest', () => {
    const recs = [
      makeRec('a', 'ROUTINE'),
      makeRec('b', 'IMMEDIATE'),
      makeRec('c', 'SHORT_TERM'),
    ];
    const sorted = engine.getCriticalFirst(recs);
    expect(sorted[0].urgency).toBe('IMMEDIATE');
    expect(sorted[1].urgency).toBe('SHORT_TERM');
    expect(sorted[2].urgency).toBe('ROUTINE');
  });
});

describe('AlertGenerationEngine', () => {
  const engine = new AlertGenerationEngine();

  it('generates CRITICAL alert for severe hypoglycemia', () => {
    const ctx = makeContext({
      conditions: ['diabetes'],
      biomarkers: [{ marker: 'glucose', value: 35, unit: 'mg/dL' }],
      medications: [],
    });
    const alerts = engine.generate(ctx);
    expect(alerts.some((a) => a.isCritical())).toBe(true);
  });

  it('generates HIGH alert for elevated HbA1c', () => {
    const ctx = makeContext({
      conditions: ['diabetes'],
      biomarkers: [{ marker: 'hba1c', value: 9.5, unit: '%' }],
      medications: [],
    });
    const alerts = engine.generate(ctx);
    expect(alerts.some((a) => a.severity === 'HIGH' || a.severity === 'CRITICAL')).toBe(true);
  });

  it('detects drug interaction alert for warfarin + aspirin', () => {
    const alerts = engine.generate(makeContext());
    const drugAlert = alerts.find((a) => a.alertType === 'DRUG_INTERACTION');
    expect(drugAlert).toBeDefined();
  });

  it('generates decompensation alert for uncontrolled diabetes', () => {
    const ctx = makeContext({
      conditions: ['diabetes'],
      biomarkers: [{ marker: 'hba1c', value: 10.5, unit: '%' }],
      medications: [],
    });
    const alerts = engine.generate(ctx);
    expect(alerts.some((a) => a.alertType === 'DISEASE_DECOMPENSATION')).toBe(true);
  });

  it('generates renal alert when eGFR < 30', () => {
    const ctx = makeContext({
      biomarkers: [{ marker: 'egfr', value: 22, unit: 'mL/min' }],
      medications: [],
    });
    const alerts = engine.generate(ctx);
    expect(alerts.some((a) => a.alertType === 'RENAL_RISK')).toBe(true);
  });

  it('returns empty array for healthy patient', () => {
    const ctx = new DecisionContext({
      patientId: 'healthy',
      demographics: { age: 30, sex: 'MALE' },
      conditions: [],
      biomarkers: [],
      medications: [],
      allergies: [],
    });
    const alerts = engine.generate(ctx);
    expect(alerts).toHaveLength(0);
  });
});

describe('ContraindicationEngine', () => {
  const engine = new ContraindicationEngine();

  it('detects allergy contraindication', () => {
    const ctx = makeContext({
      conditions: [],
      medications: [{ name: 'sulfamethoxazole', isCurrent: true }],
      allergies: ['sulfa'],
    });
    const cis = engine.analyze(ctx);
    expect(cis.some((c) => c.contraindicationType === 'ALLERGY')).toBe(true);
  });

  it('detects genetic contraindication for codeine in poor metabolizer', () => {
    const ctx = makeContext({
      conditions: [],
      medications: [{ name: 'codeine', isCurrent: true }],
      allergies: [],
      geneticProfile: {
        variants: [{ gene: 'CYP2D6', haplotype: '*4/*4', phenotype: 'POOR_METABOLIZER' }],
      },
    });
    const cis = engine.analyze(ctx);
    expect(cis.some((c) => c.contraindicationType === 'GENETIC')).toBe(true);
  });

  it('detects CKD + NSAID contraindication', () => {
    const ctx = makeContext({
      conditions: ['ckd'],
      medications: [{ name: 'ibuprofen', isCurrent: true }],
      allergies: [],
    });
    const cis = engine.analyze(ctx);
    expect(cis.some((c) => c.contraindicationType === 'DISEASE_RELATED')).toBe(true);
  });

  it('detects drug-drug interaction warfarin + aspirin', () => {
    const cis = engine.analyze(makeContext());
    expect(cis.some((c) => c.contraindicationType === 'DRUG_DRUG_INTERACTION')).toBe(true);
  });

  it('returns empty for patient with no conflicts', () => {
    const ctx = new DecisionContext({
      patientId: 'clean',
      demographics: { age: 25, sex: 'FEMALE' },
      conditions: [],
      medications: [{ name: 'metformin', isCurrent: true }],
      allergies: [],
    });
    const cis = engine.analyze(ctx);
    expect(cis).toHaveLength(0);
  });
});

describe('EvidenceLinkEngine', () => {
  const engine = new EvidenceLinkEngine();
  const ctx = makeContext({ conditions: ['diabetes', 'hypertension'] });
  const recs = [makeRec('recommend HbA1c monitoring'), makeRec('adjust antihypertensive')];

  it('links evidence for known conditions', () => {
    const evidence = engine.link(recs, ctx);
    expect(evidence.length).toBeGreaterThan(0);
  });

  it('links ADA guideline for diabetes context', () => {
    const evidence = engine.link(recs, ctx);
    expect(evidence.some((e) => e.topic === 'diabetes')).toBe(true);
  });

  it('links ESC guideline for hypertension context', () => {
    const evidence = engine.link(recs, ctx);
    expect(evidence.some((e) => e.topic === 'hypertension')).toBe(true);
  });

  it('attaches pharmacogenomics evidence when genetic profile present', () => {
    const ctxWithGenetics = makeContext({
      geneticProfile: {
        variants: [{ gene: 'CYP2D6', haplotype: '*4/*4', phenotype: 'POOR_METABOLIZER' }],
      },
    });
    const evidence = engine.link(recs, ctxWithGenetics);
    expect(evidence.some((e) => e.topic === 'pharmacogenomics')).toBe(true);
  });

  it('returns empty for no matched context', () => {
    const emptyCtx = new DecisionContext({
      patientId: 'empty',
      demographics: { age: 25, sex: 'MALE' },
      conditions: [],
      biomarkers: [],
      medications: [],
      allergies: [],
    });
    const evidence = engine.link([], emptyCtx);
    expect(evidence).toHaveLength(0);
  });
});

describe('RecommendationConflictResolverEngine', () => {
  const engine = new RecommendationConflictResolverEngine();
  const ctx = makeContext({ allergies: ['penicillin'] });

  it('filters recommendations containing known allergen', () => {
    const recs = [makeRec('administer penicillin'), makeRec('recommend metformin')];
    const result = engine.resolve(recs, [], ctx);
    expect(result.resolvedRecommendations.some((r) => r.action.includes('penicillin'))).toBe(false);
    expect(result.allergyConflicts).toHaveLength(1);
  });

  it('filters genetically contraindicated drugs', () => {
    const recs = [makeRec('administer codeine'), makeRec('recommend aspirin')];
    const codeineCi = new Contraindication({
      patientId: 'p1',
      medication: 'codeine',
      contraindicationType: 'GENETIC',
      severity: 'CONTRAINDICATED',
      reason: 'CYP2D6 PM',
      evidenceSummary: 'CPIC',
    });
    const result = engine.resolve(recs, [codeineCi], ctx);
    expect(result.geneticConflicts).toHaveLength(1);
    expect(result.resolvedRecommendations.some((r) => r.action.includes('codeine'))).toBe(false);
  });

  it('creates conflict records for each resolution', () => {
    const recs = [makeRec('administer penicillin')];
    const result = engine.resolve(recs, [], ctx);
    expect(result.conflicts.length).toBeGreaterThan(0);
  });

  it('passes clean recommendations unchanged', () => {
    const recs = [makeRec('recommend metformin'), makeRec('schedule follow-up')];
    const emptyCtx = new DecisionContext({
      patientId: 'clean',
      demographics: { age: 40, sex: 'FEMALE' },
    });
    const result = engine.resolve(recs, [], emptyCtx);
    expect(result.resolvedRecommendations).toHaveLength(2);
    expect(result.conflicts).toHaveLength(0);
  });
});

describe('DecisionExplanationEngine', () => {
  const engine = new DecisionExplanationEngine();
  const ctx = makeContext();
  const recs = [makeRec('intensify glycemic control', 'IMMEDIATE')];

  it('builds explanation with required fields', () => {
    const explanation = engine.explain({
      context: ctx,
      recommendations: recs,
      evidence: [],
      linkedEvidence: [],
      alerts: [],
      contraindications: [],
      conflicts: [],
      modulesWithData: ['TherapeuticStrategy', 'DiagnosticStrategy'],
      modulesQueried: ['TherapeuticStrategy', 'DiagnosticStrategy', 'MonitoringStrategy'],
      confidenceScore: 78,
    });

    expect(explanation.why).toBeTruthy();
    expect(explanation.how).toBeTruthy();
    expect(explanation.confidenceScore).toBe(78);
    expect(explanation.reasoning).toBeInstanceOf(Array);
    expect(explanation.limitations).toBeInstanceOf(Array);
    expect(explanation.dataCompleteness).toBeCloseTo(67, 0);
  });

  it('identifies missing modules in limitations', () => {
    const explanation = engine.explain({
      context: ctx,
      recommendations: [],
      evidence: [],
      linkedEvidence: [],
      alerts: [],
      contraindications: [],
      conflicts: [],
      modulesWithData: [],
      modulesQueried: ['ModA', 'ModB'],
      confidenceScore: 20,
    });
    expect(explanation.limitations.some((l) => l.includes('Missing data'))).toBe(true);
    expect(explanation.limitations.some((l) => l.includes('confidence'))).toBe(true);
  });
});
