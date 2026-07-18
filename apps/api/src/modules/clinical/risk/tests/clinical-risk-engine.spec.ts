import { ClinicalRiskEngine } from '../clinical-risk-engine';
import { ClinicalRiskModel } from '../clinical-risk.types';
import { ScoringService } from '../../scoring/services/scoring.service';
import { ExplainabilityEngine } from '../../../gaia/explainability';
import { ClinicalContext } from '../../../gaia/contracts';

function buildContext(overrides: Partial<ClinicalContext> = {}): ClinicalContext {
  const empty = { available: false, items: [] as unknown[] };
  return {
    patientId: 'patient-1',
    metadata: { generatedAt: new Date(), window: { from: new Date(), to: new Date() }, sourcesQueried: [] },
    patient: null,
    vitals: empty,
    laboratory: empty,
    lifestyle: empty,
    nutrition: empty,
    medication: empty,
    conditions: empty,
    assessments: empty,
    wearables: empty,
    familyHistory: empty,
    genomics: empty,
    imaging: empty,
    fhirResources: empty,
    ...overrides,
  };
}

// Modelo fake só pra provar que o Engine não conhece nenhum detalhe de
// doença — usa um ScoringInput trivial de 1 campo, sem BMI/passos/sono/etc.
function buildFakeModel(overrides: Partial<ClinicalRiskModel> = {}): ClinicalRiskModel {
  return {
    category: 'METABOLIC' as ClinicalRiskModel['category'],
    name: 'fake-risk-model',
    version: '9.9.9',
    scoringEngineName: 'risk-classification',
    requiredCapabilities: ['vitals', 'wearables'],
    buildScoringInput: jest.fn().mockReturnValue({
      sections: [{ id: 's1', title: 'Fake Section', order: 0 }],
      fields: [{ id: 'f1', sectionId: 's1', label: 'Fake Field', scoringWeight: 1, min: 0, max: 10, required: false }],
      answers: [{ fieldId: 'f1', value: '9', score: 9 }],
    }),
    buildRecommendations: jest.fn().mockReturnValue(['fake recommendation']),
    ...overrides,
  };
}

describe('ClinicalRiskEngine', () => {
  let engine: ClinicalRiskEngine;
  let scoringService: ScoringService;

  beforeEach(() => {
    scoringService = new ScoringService();
    engine = new ClinicalRiskEngine(scoringService, new ExplainabilityEngine());
  });

  it('delegates scoring to the real ScoringService — never computes a score itself', () => {
    const calculateSpy = jest.spyOn(scoringService, 'calculate');
    const model = buildFakeModel();

    const assessment = engine.assess(model, buildContext());

    expect(calculateSpy).toHaveBeenCalledWith('risk-classification', model.buildScoringInput(buildContext()));
    expect(assessment.riskLevel).toEqual(expect.any(String));
    expect(assessment.riskScore).toBeGreaterThanOrEqual(0);
  });

  it('asks the model (not itself) to translate ClinicalContext into ScoringInput', () => {
    const model = buildFakeModel();
    const context = buildContext();
    engine.assess(model, context);

    expect(model.buildScoringInput).toHaveBeenCalledWith(context);
  });

  it('asks the model (not itself) to derive recommendations from the ScoringResult', () => {
    const model = buildFakeModel();
    const assessment = engine.assess(model, buildContext());

    expect(model.buildRecommendations).toHaveBeenCalled();
    expect(assessment.recommendations).toEqual(['fake recommendation']);
  });

  it('carries the model category and version into the assessment', () => {
    const model = buildFakeModel({ version: '3.1.4' });
    const assessment = engine.assess(model, buildContext());

    expect(assessment.riskCategory).toBe('METABOLIC');
    expect(assessment.modelVersion).toBe('3.1.4');
  });

  it('embeds the same Confidence reference in both confidence and explainability.confidence', () => {
    const assessment = engine.assess(buildFakeModel(), buildContext());
    expect(assessment.confidence).toBe(assessment.explainability.confidence);
  });

  it('computes confidence score as the fraction of required capabilities with data', () => {
    const model = buildFakeModel({ requiredCapabilities: ['vitals', 'wearables'] });

    const noneAvailable = engine.assess(model, buildContext());
    expect(noneAvailable.confidence.score).toBe(0);

    const oneAvailable = engine.assess(
      model,
      buildContext({ vitals: { available: true, items: [{ id: 'v1' }] } }),
    );
    expect(oneAvailable.confidence.score).toBe(0.5);

    const bothAvailable = engine.assess(
      model,
      buildContext({
        vitals: { available: true, items: [{ id: 'v1' }] },
        wearables: { available: true, items: [{ id: 'w1' }] },
      }),
    );
    expect(bothAvailable.confidence.score).toBe(1);
  });

  it('gives confidence score 1 when the model declares no required capabilities', () => {
    const model = buildFakeModel({ requiredCapabilities: [] });
    const assessment = engine.assess(model, buildContext());
    expect(assessment.confidence.score).toBe(1);
  });

  it('produces a DecisionTrace with PROVIDER/RECOMMENDATION/EXPLAINABILITY steps, all SUCCESS', () => {
    const assessment = engine.assess(buildFakeModel(), buildContext());

    expect(assessment.decisionTrace.patientId).toBe('patient-1');
    expect(assessment.decisionTrace.steps.map((s) => s.stage)).toEqual([
      'PROVIDER',
      'PROVIDER',
      'RECOMMENDATION',
      'EXPLAINABILITY',
    ]);
    expect(assessment.decisionTrace.steps.every((s) => s.status === 'SUCCESS')).toBe(true);
  });

  it('freezes the returned DecisionTrace (immutable domain object)', () => {
    const assessment = engine.assess(buildFakeModel(), buildContext());
    expect(Object.isFrozen(assessment.decisionTrace)).toBe(true);
  });

  it('gives every assessment a distinct riskId', () => {
    const model = buildFakeModel();
    const a = engine.assess(model, buildContext());
    const b = engine.assess(model, buildContext());
    expect(a.riskId).not.toBe(b.riskId);
  });
});
