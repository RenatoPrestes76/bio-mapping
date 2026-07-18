import { PredictionBuilder } from '../prediction-builder';
import { ExplainabilityEngine } from '../../explainability';
import { PredictionModel, PredictionStateResult, PredictionWindow } from '../prediction.types';
import { ClinicalContext, Confidence, DecisionTrace } from '../../contracts';

describe('PredictionBuilder', () => {
  let engine: { computeConfidence: jest.Mock };
  const fakeConfidence: Confidence = {
    score: 0.5,
    level: 'MODERATE',
    factors: [],
    missingInformation: [],
    dataQuality: null,
    completeness: 0.5,
  };
  const context = { patientId: 'patient-1' } as ClinicalContext;
  const trace: DecisionTrace = Object.freeze({ traceId: 'trace-1', patientId: 'patient-1', steps: Object.freeze([]) });
  const model: PredictionModel = {
    name: 'lifestyle-trend',
    predictionType: 'TREND',
    version: '0.1.0',
    requiredCapabilities: [],
    computeStates: jest.fn(),
    buildPredictionWindow: jest.fn(),
    buildRecommendations: jest.fn(),
  };
  const stateResult: PredictionStateResult = {
    current: { activity: { trend: 'DECLINING', score: 0 } },
    predicted: { activity: { trend: 'DECLINING', score: 0 } },
    currentScore: 0,
    predictedScore: 0,
  };
  const window: PredictionWindow = {
    start: new Date('2026-01-08'),
    end: new Date('2026-01-15'),
    duration: 7,
    unit: 'DAYS',
  };

  beforeEach(() => {
    engine = { computeConfidence: jest.fn().mockReturnValue(fakeConfidence) };
  });

  it('builds a Prediction from a PredictionStateResult', () => {
    const builder = new PredictionBuilder(engine as unknown as ExplainabilityEngine, model, context);

    const prediction = builder.build(stateResult, window, ['rec-1', 'rec-2'], 0.5, trace);

    expect(prediction.predictionType).toBe('TREND');
    expect(prediction.currentState).toBe(stateResult.current);
    expect(prediction.predictedState).toBe(stateResult.predicted);
    expect(prediction.predictionWindow).toBe(window);
    expect(prediction.recommendations).toEqual(['rec-1', 'rec-2']);
    expect(prediction.modelVersion).toBe('0.1.0');
    expect(prediction.decisionTrace).toBe(trace);
    expect(prediction.predictionId).toEqual(expect.any(String));
  });

  it('embeds the same Confidence reference in confidence and explainability.confidence (Diretriz 5)', () => {
    const builder = new PredictionBuilder(engine as unknown as ExplainabilityEngine, model, context);
    const prediction = builder.build(stateResult, window, [], 0.5, trace);

    expect(prediction.confidence).toBe(prediction.explainability.confidence);
    expect(prediction.confidence).toBe(fakeConfidence);
  });

  it('flags every prediction as trend, never diagnosis, in the explainability limitations (Diretriz 8)', () => {
    const builder = new PredictionBuilder(engine as unknown as ExplainabilityEngine, model, context);
    const prediction = builder.build(stateResult, window, [], 0.5, trace);

    expect(prediction.explainability.limitations).toEqual(
      expect.arrayContaining([expect.stringContaining('não é diagnóstico')]),
    );
  });

  it('passes the confidence score and context through to the engine unchanged', () => {
    const builder = new PredictionBuilder(engine as unknown as ExplainabilityEngine, model, context);
    builder.build(stateResult, window, [], 0.83, trace);

    expect(engine.computeConfidence).toHaveBeenCalledWith(0.83, context, {});
  });

  it('stores the model name and both aggregate scores in metadata', () => {
    const builder = new PredictionBuilder(engine as unknown as ExplainabilityEngine, model, context);
    const prediction = builder.build(stateResult, window, [], 0.5, trace);

    expect(prediction.metadata).toEqual({
      predictionModelName: 'lifestyle-trend',
      currentScore: 0,
      predictedScore: 0,
    });
  });
});
