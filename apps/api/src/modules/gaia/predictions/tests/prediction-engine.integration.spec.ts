import { Test, TestingModule } from '@nestjs/testing';
import { DecisionEngineService } from '../../decision-engine.service';
import { ClinicalContextBuilder } from '../../clinical-context.builder';
import { ExplainabilityEngine } from '../../explainability';
import {
  RecommendationDeduplicator,
  RecommendationEngine,
  RecommendationPrioritizer,
  RecommendationRegistry,
} from '../../recommendations';
import { PredictionEngine } from '../prediction-engine';
import { PredictionRegistry } from '../prediction-registry';
import { PredictionProvider } from '../prediction-provider';
import { LIFESTYLE_TREND_MODEL } from '../models/lifestyle-trend.model';
import { ClinicalContext, DecisionProvider } from '../../contracts';

function steps(values: number[]) {
  return values.map((value, i) => ({ metricType: 'STEPS', value, recordedAt: new Date(2026, 0, 1 + i) }));
}

/**
 * Prova de integração (Sprint 14.5, E8): o pipeline do GAIA roda o
 * prediction-engine ao lado de outro provider real, sem nenhuma alteração ao
 * DecisionEngineService — mesmo padrão do clinical-risk.integration.spec.ts
 * (Sprint 14.3).
 */
describe('PredictionProvider integration with DecisionEngineService', () => {
  let decisionEngine: DecisionEngineService;
  let predictionProvider: PredictionProvider;

  const context: ClinicalContext = {
    patientId: 'patient-1',
    metadata: {
      generatedAt: new Date(),
      window: { from: new Date('2026-01-01'), to: new Date('2026-01-08') },
      sourcesQueried: [],
    },
    patient: null,
    vitals: { available: false, items: [] },
    laboratory: { available: false, items: [] },
    lifestyle: { available: false, items: [] },
    nutrition: { available: false, items: [] },
    medication: { available: false, items: [] },
    conditions: { available: false, items: [] },
    assessments: { available: false, items: [] },
    wearables: { available: true, items: steps([7000, 6000, 5000, 4000, 3000, 2000, 1000]) as never },
    familyHistory: { available: false, items: [] },
    genomics: { available: false, items: [] },
    imaging: { available: false, items: [] },
    fhirResources: { available: false, items: [] },
  };

  let fakeAegisLikeProvider: DecisionProvider;

  beforeEach(async () => {
    fakeAegisLikeProvider = {
      name: 'aegis-wellness',
      domain: 'WELLNESS',
      version: '1.0.0',
      supports: () => true,
      generateInsights: jest.fn().mockResolvedValue([]),
      generateRecommendations: jest.fn().mockResolvedValue([]),
      generatePredictions: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecisionEngineService,
        PredictionEngine,
        PredictionRegistry,
        PredictionProvider,
        ExplainabilityEngine,
        RecommendationEngine,
        RecommendationRegistry,
        RecommendationDeduplicator,
        RecommendationPrioritizer,
        { provide: ClinicalContextBuilder, useValue: { build: jest.fn().mockResolvedValue(context) } },
      ],
    }).compile();

    decisionEngine = module.get(DecisionEngineService);
    predictionProvider = module.get(PredictionProvider);

    const registry = module.get(PredictionRegistry);
    registry.register(LIFESTYLE_TREND_MODEL);

    decisionEngine.registerProvider(fakeAegisLikeProvider);
    decisionEngine.registerProvider(predictionProvider);
  });

  it('lists both providers, aegis-wellness before prediction-engine (registration order)', () => {
    expect(decisionEngine.listProviders()).toEqual(['aegis-wellness', 'prediction-engine']);
  });

  it('runs both providers and aggregates a real lifestyle-trend prediction', async () => {
    const result = await decisionEngine.runPipeline('patient-1', {
      providers: ['aegis-wellness', 'prediction-engine'],
    });

    expect(result.providersRun).toEqual(['aegis-wellness', 'prediction-engine']);
    expect(result.results).toHaveLength(2);

    const predictionResult = result.results.find((r) => r.provider === 'prediction-engine')!;
    expect(predictionResult.provenance.executionStatus).toBe('SUCCESS');
    expect(predictionResult.predictions).toHaveLength(1);
    expect(predictionResult.predictions[0].predictionType).toBe('TREND');
    expect(predictionResult.insights).toHaveLength(1);
    expect(predictionResult.recommendations).toHaveLength(1);
    expect(predictionResult.recommendations[0].actions).toContain(
      'Tendência de redução na atividade física recente',
    );
  });

  it('does not touch the fake aegis-wellness provider at all', async () => {
    await decisionEngine.runPipeline('patient-1', { providers: ['aegis-wellness', 'prediction-engine'] });

    expect(fakeAegisLikeProvider.generateInsights).toHaveBeenCalledTimes(1);
    expect(fakeAegisLikeProvider.generateRecommendations).toHaveBeenCalledTimes(1);
    expect(fakeAegisLikeProvider.generatePredictions).toHaveBeenCalledTimes(1);
  });

  it('consolidates the lifestyle-trend recommendation into the top-level recommendationSet, never a RecommendationSet from the provider itself', async () => {
    const result = await decisionEngine.runPipeline('patient-1', {
      providers: ['aegis-wellness', 'prediction-engine'],
    });

    expect(result.recommendationSet.providerCount).toBe(1);
    expect(result.recommendationSet.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendationSet.recommendations[0].sources[0].provider).toBe('prediction-engine');
  });
});
