import { Test, TestingModule } from '@nestjs/testing';
import { DecisionEngineService } from '../../../gaia/decision-engine.service';
import { ClinicalContextBuilder } from '../../../gaia/clinical-context.builder';
import { ExplainabilityEngine } from '../../../gaia/explainability';
import {
  RecommendationDeduplicator,
  RecommendationEngine,
  RecommendationPrioritizer,
  RecommendationRegistry,
} from '../../../gaia/recommendations';
import { ScoringService } from '../../scoring/services/scoring.service';
import { ClinicalRiskEngine } from '../clinical-risk-engine';
import { ClinicalRiskRegistry } from '../clinical-risk.registry';
import { ClinicalRiskProvider } from '../clinical-risk.provider';
import { METABOLIC_RISK_MODEL } from '../models/metabolic-risk.model';
import { ClinicalContext, DecisionProvider } from '../../../gaia/contracts';

/**
 * Prova de integração (Sprint 14.3, T8/T9): o pipeline do GAIA roda o
 * clinical-risk ao lado de outro provider real (não o aegis-wellness
 * completo, que exigiria todo o grafo de dependências do módulo aegis —
 * um provider fake equivalente basta pra provar ordem/composição), sem
 * nenhuma alteração ao DecisionEngineService.
 */
describe('ClinicalRiskProvider integration with DecisionEngineService', () => {
  let decisionEngine: DecisionEngineService;
  let clinicalRiskProvider: ClinicalRiskProvider;

  const context: ClinicalContext = {
    patientId: 'patient-1',
    metadata: { generatedAt: new Date(), window: { from: new Date(), to: new Date() }, sourcesQueried: [] },
    patient: null,
    vitals: { available: true, items: [{ id: 'v1', recordedAt: new Date(), bmi: 22 } as never] },
    laboratory: { available: false, items: [] },
    lifestyle: { available: false, items: [] },
    nutrition: { available: false, items: [] },
    medication: { available: false, items: [] },
    conditions: { available: false, items: [] },
    assessments: { available: false, items: [] },
    wearables: {
      available: true,
      items: [
        { metricType: 'STEPS', value: 9000 } as never,
        { metricType: 'SLEEP', value: 450 } as never,
      ],
    },
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
        ClinicalRiskEngine,
        ClinicalRiskRegistry,
        ClinicalRiskProvider,
        ExplainabilityEngine,
        ScoringService,
        RecommendationEngine,
        RecommendationRegistry,
        RecommendationDeduplicator,
        RecommendationPrioritizer,
        { provide: ClinicalContextBuilder, useValue: { build: jest.fn().mockResolvedValue(context) } },
      ],
    }).compile();

    decisionEngine = module.get(DecisionEngineService);
    clinicalRiskProvider = module.get(ClinicalRiskProvider);

    const registry = module.get(ClinicalRiskRegistry);
    registry.register(METABOLIC_RISK_MODEL);

    decisionEngine.registerProvider(fakeAegisLikeProvider);
    decisionEngine.registerProvider(clinicalRiskProvider);
  });

  it('lists both providers, aegis-wellness before clinical-risk (registration order)', () => {
    expect(decisionEngine.listProviders()).toEqual(['aegis-wellness', 'clinical-risk']);
  });

  it('runs both providers in an explicit order and aggregates a real metabolic-risk assessment', async () => {
    const result = await decisionEngine.runPipeline('patient-1', {
      providers: ['aegis-wellness', 'clinical-risk'],
    });

    expect(result.providersRun).toEqual(['aegis-wellness', 'clinical-risk']);
    expect(result.results).toHaveLength(2);

    const riskResult = result.results.find((r) => r.provider === 'clinical-risk')!;
    expect(riskResult.provenance.executionStatus).toBe('SUCCESS');
    expect(riskResult.insights).toHaveLength(1);
    expect(riskResult.insights[0].category).toBe('METABOLIC');
    expect(riskResult.recommendations).toHaveLength(1);
    expect(riskResult.recommendations[0].actions.length).toBeGreaterThan(0);
  });

  it('does not touch the fake aegis-wellness provider at all', async () => {
    await decisionEngine.runPipeline('patient-1', { providers: ['aegis-wellness', 'clinical-risk'] });

    expect(fakeAegisLikeProvider.generateInsights).toHaveBeenCalledTimes(1);
    expect(fakeAegisLikeProvider.generateRecommendations).toHaveBeenCalledTimes(1);
    expect(fakeAegisLikeProvider.generatePredictions).toHaveBeenCalledTimes(1);
  });

  it('produces a top-level pipeline DecisionTrace covering both providers', async () => {
    const result = await decisionEngine.runPipeline('patient-1', {
      providers: ['aegis-wellness', 'clinical-risk'],
    });

    const providerSteps = result.trace.steps.filter((s) => s.stage === 'PROVIDER');
    // 2 steps per provider (insights, predictions) x 2 providers = 4
    expect(providerSteps.length).toBeGreaterThanOrEqual(4);
  });

  it('consolidates the metabolic-risk recommendation into the top-level recommendationSet (Sprint 14.4)', async () => {
    const result = await decisionEngine.runPipeline('patient-1', {
      providers: ['aegis-wellness', 'clinical-risk'],
    });

    expect(result.recommendationSet.providerCount).toBe(1);
    expect(result.recommendationSet.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendationSet.recommendations[0].sources[0].provider).toBe('clinical-risk');
  });
});
