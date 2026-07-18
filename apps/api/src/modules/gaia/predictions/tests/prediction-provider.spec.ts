import { Test, TestingModule } from '@nestjs/testing';
import { PredictionProvider } from '../prediction-provider';
import { PredictionRegistry } from '../prediction-registry';
import { PredictionEngine } from '../prediction-engine';
import { Prediction, PredictionModel } from '../prediction.types';
import { ClinicalContext, Confidence, DecisionTrace, Explainability } from '../../contracts';

describe('PredictionProvider', () => {
  let provider: PredictionProvider;
  let registry: { listEnabled: jest.Mock };
  let engine: { predict: jest.Mock };

  const context = { patientId: 'patient-1' } as ClinicalContext;
  const fakeModel = { name: 'lifestyle-trend' } as PredictionModel;

  const confidence: Confidence = {
    score: 0.5,
    level: 'MODERATE',
    factors: [],
    missingInformation: [],
    dataQuality: null,
    completeness: 0.5,
  };
  const explainability: Explainability = {
    decisionId: 'decision-1',
    confidence,
    reasoning: 'lifestyle-trend: tendência projetada para os próximos 7 dias',
    evidence: [],
    sourceProvider: 'prediction-engine',
    generatedAt: new Date(),
    guidelineReferences: [],
    limitations: [],
    warnings: [],
    metadata: {},
  };
  const trace: DecisionTrace = Object.freeze({ traceId: 'trace-1', patientId: 'patient-1', steps: Object.freeze([]) });

  const prediction: Prediction = {
    predictionId: 'prediction-1',
    predictionType: 'TREND',
    currentState: { activity: { trend: 'DECLINING', score: 0 } },
    predictedState: { activity: { trend: 'DECLINING', score: 0 } },
    predictionWindow: { start: new Date('2026-01-08'), end: new Date('2026-01-15'), duration: 7, unit: 'DAYS' },
    confidence,
    explainability,
    recommendations: ['Tendência de redução na atividade física recente'],
    decisionTrace: trace,
    modelVersion: '0.1.0',
    metadata: { predictionModelName: 'lifestyle-trend', currentScore: 2, predictedScore: 1 },
  };

  beforeEach(async () => {
    registry = { listEnabled: jest.fn().mockReturnValue([fakeModel]) };
    engine = { predict: jest.fn().mockReturnValue(prediction) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PredictionProvider,
        { provide: PredictionRegistry, useValue: registry },
        { provide: PredictionEngine, useValue: engine },
      ],
    }).compile();

    provider = module.get(PredictionProvider);
  });

  it('declares itself as the prediction-engine provider', () => {
    expect(provider.name).toBe('prediction-engine');
    expect(provider.domain).toBe('WELLNESS');
    expect(provider.version).toBe('1.0.0');
  });

  it('supports() is always true', () => {
    expect(provider.supports()).toBe(true);
  });

  describe('generateInsights', () => {
    it('predicts with every enabled model and maps each Prediction to an InsightSignal', async () => {
      const result = await provider.generateInsights(context);

      expect(engine.predict).toHaveBeenCalledWith(fakeModel, context);
      expect(result).toEqual([
        {
          insightId: 'prediction-1',
          provider: 'prediction-engine',
          domain: 'WELLNESS',
          category: 'lifestyle-trend',
          priority: 'IMPORTANTE',
          title: 'Previsão (TREND) — lifestyle-trend',
          message: explainability.reasoning,
          explainability,
        },
      ]);
    });

    it.each([
      [1, 'IMPORTANTE'],
      [4, 'ATENCAO'],
      [8, 'INFORMATIVO'],
    ] as const)('maps predictedScore %d to priority %s', async (predictedScore, expectedPriority) => {
      engine.predict.mockReturnValue({ ...prediction, metadata: { ...prediction.metadata, predictedScore } });

      const result = await provider.generateInsights(context);

      expect(result[0].priority).toBe(expectedPriority);
    });
  });

  describe('generateRecommendations', () => {
    it('maps each Prediction to a RecommendationCandidate carrying the model recommendations as actions', async () => {
      const result = await provider.generateRecommendations(context, []);

      expect(result).toEqual([
        {
          recommendationId: expect.any(String),
          provider: 'prediction-engine',
          priority: 'IMPORTANTE',
          category: 'lifestyle-trend',
          title: 'Tendência prevista — lifestyle-trend',
          description: 'Previsão para os próximos 7 dias',
          rationale: explainability.reasoning,
          actions: ['Tendência de redução na atividade física recente'],
          explainability,
        },
      ]);
    });

    it('never returns a RecommendationSet — only RecommendationCandidate[] (P8)', async () => {
      const result = await provider.generateRecommendations(context, []);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).not.toHaveProperty('recommendations');
      expect(result[0]).not.toHaveProperty('statistics');
    });

    it('reuses the same explainability instance for insight and recommendation from the same prediction', async () => {
      const [insight] = await provider.generateInsights(context);
      const [recommendation] = await provider.generateRecommendations(context, []);

      expect(insight.explainability).toBe(recommendation.explainability);
    });
  });

  describe('generatePredictions', () => {
    it('maps each Prediction to a PredictionOutput (Sprint 14.1 contract, unchanged)', async () => {
      const result = await provider.generatePredictions(context);

      expect(result).toEqual([
        {
          predictionType: 'TREND',
          currentValue: 2,
          predictedValue: 1,
          predictionDate: prediction.predictionWindow.end,
          modelVersion: '0.1.0',
          explainability,
        },
      ]);
    });
  });
});
