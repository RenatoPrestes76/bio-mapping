import { PredictionEngine } from '../prediction-engine';
import { PredictionModel, PredictionStateResult, PredictionWindow } from '../prediction.types';
import { ExplainabilityEngine } from '../../explainability';
import { ClinicalContext } from '../../contracts';

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

const fakeStateResult: PredictionStateResult = {
  current: { fake: { trend: 'STABLE', score: 5 } },
  predicted: { fake: { trend: 'STABLE', score: 5 } },
  currentScore: 5,
  predictedScore: 5,
};

const fakeWindow: PredictionWindow = {
  start: new Date('2026-01-08'),
  end: new Date('2026-01-15'),
  duration: 7,
  unit: 'DAYS',
};

// Modelo fake só pra provar que o Engine não conhece nenhum detalhe de
// domínio — nunca lifestyle/peso/sono, só o contrato PredictionModel.
function buildFakeModel(overrides: Partial<PredictionModel> = {}): PredictionModel {
  return {
    name: 'fake-prediction-model',
    predictionType: 'TREND',
    version: '9.9.9',
    requiredCapabilities: ['vitals', 'wearables'],
    computeStates: jest.fn().mockReturnValue(fakeStateResult),
    buildPredictionWindow: jest.fn().mockReturnValue(fakeWindow),
    buildRecommendations: jest.fn().mockReturnValue(['fake recommendation']),
    ...overrides,
  };
}

describe('PredictionEngine', () => {
  let engine: PredictionEngine;

  beforeEach(() => {
    engine = new PredictionEngine(new ExplainabilityEngine());
  });

  it('asks the model (not itself) to compute current/predicted state', () => {
    const model = buildFakeModel();
    const context = buildContext();
    engine.predict(model, context);

    expect(model.computeStates).toHaveBeenCalledWith(context);
  });

  it('asks the model (not itself) to build the prediction window', () => {
    const model = buildFakeModel();
    const context = buildContext();
    engine.predict(model, context);

    expect(model.buildPredictionWindow).toHaveBeenCalledWith(context);
  });

  it('asks the model (not itself) to derive recommendations from the state result', () => {
    const model = buildFakeModel();
    const prediction = engine.predict(model, buildContext());

    expect(model.buildRecommendations).toHaveBeenCalledWith(fakeStateResult);
    expect(prediction.recommendations).toEqual(['fake recommendation']);
  });

  it('carries the model predictionType and version into the prediction', () => {
    const model = buildFakeModel({ predictionType: 'TREND', version: '3.1.4' });
    const prediction = engine.predict(model, buildContext());

    expect(prediction.predictionType).toBe('TREND');
    expect(prediction.modelVersion).toBe('3.1.4');
  });

  it('embeds the same Confidence reference in both confidence and explainability.confidence', () => {
    const prediction = engine.predict(buildFakeModel(), buildContext());
    expect(prediction.confidence).toBe(prediction.explainability.confidence);
  });

  it('computes confidence score as the fraction of required capabilities with data', () => {
    const model = buildFakeModel({ requiredCapabilities: ['vitals', 'wearables'] });

    const noneAvailable = engine.predict(model, buildContext());
    expect(noneAvailable.confidence.score).toBe(0);

    const oneAvailable = engine.predict(
      model,
      buildContext({ vitals: { available: true, items: [{ id: 'v1' }] } }),
    );
    expect(oneAvailable.confidence.score).toBe(0.5);

    const bothAvailable = engine.predict(
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
    const prediction = engine.predict(model, buildContext());
    expect(prediction.confidence.score).toBe(1);
  });

  it('produces a DecisionTrace with PROVIDER/PROVIDER/RECOMMENDATION/EXPLAINABILITY steps, all SUCCESS', () => {
    const prediction = engine.predict(buildFakeModel(), buildContext());

    expect(prediction.decisionTrace.patientId).toBe('patient-1');
    expect(prediction.decisionTrace.steps.map((s) => s.stage)).toEqual([
      'PROVIDER',
      'PROVIDER',
      'RECOMMENDATION',
      'EXPLAINABILITY',
    ]);
    expect(prediction.decisionTrace.steps.every((s) => s.status === 'SUCCESS')).toBe(true);
  });

  it('freezes the returned DecisionTrace (immutable domain object)', () => {
    const prediction = engine.predict(buildFakeModel(), buildContext());
    expect(Object.isFrozen(prediction.decisionTrace)).toBe(true);
  });

  it('gives every prediction a distinct predictionId', () => {
    const model = buildFakeModel();
    const a = engine.predict(model, buildContext());
    const b = engine.predict(model, buildContext());
    expect(a.predictionId).not.toBe(b.predictionId);
  });
});
