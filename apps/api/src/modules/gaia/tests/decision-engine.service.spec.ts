import { Test, TestingModule } from '@nestjs/testing';
import { DecisionEngineService } from '../decision-engine.service';
import { ClinicalContextBuilder } from '../clinical-context.builder';
import { ExplainabilityEngine } from '../explainability';
import {
  RecommendationDeduplicator,
  RecommendationEngine,
  RecommendationPrioritizer,
  RecommendationRegistry,
} from '../recommendations';
import { ClinicalContext, DecisionProvider } from '../contracts';

describe('DecisionEngineService', () => {
  let service: DecisionEngineService;
  let contextBuilder: { build: jest.Mock };

  const baseContext: ClinicalContext = {
    patientId: 'patient-1',
    metadata: { generatedAt: new Date(), window: { from: new Date(), to: new Date() }, sourcesQueried: [] },
    patient: null,
    vitals: { available: false, items: [] },
    laboratory: { available: false, items: [] },
    lifestyle: { available: false, items: [] },
    nutrition: { available: false, items: [] },
    medication: { available: false, items: [] },
    conditions: { available: false, items: [] },
    assessments: { available: false, items: [] },
    wearables: { available: false, items: [] },
    familyHistory: { available: false, items: [] },
    genomics: { available: false, items: [] },
    imaging: { available: false, items: [] },
    fhirResources: { available: false, items: [] },
  };

  const buildFakeProvider = (overrides: Partial<DecisionProvider> = {}): DecisionProvider => ({
    name: 'fake-provider',
    domain: 'WELLNESS',
    version: '1.0.0',
    supports: jest.fn().mockReturnValue(true),
    generateInsights: jest.fn().mockResolvedValue([]),
    generateRecommendations: jest.fn().mockResolvedValue([]),
    generatePredictions: jest.fn().mockResolvedValue([]),
    ...overrides,
  });

  beforeEach(async () => {
    contextBuilder = { build: jest.fn().mockResolvedValue(baseContext) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecisionEngineService,
        ExplainabilityEngine,
        RecommendationEngine,
        RecommendationRegistry,
        RecommendationDeduplicator,
        RecommendationPrioritizer,
        { provide: ClinicalContextBuilder, useValue: contextBuilder },
      ],
    }).compile();

    service = module.get(DecisionEngineService);
  });

  describe('registerProvider / listProviders', () => {
    it('registers a provider and lists it by name', () => {
      const provider = buildFakeProvider();
      service.registerProvider(provider);

      expect(service.listProviders()).toEqual(['fake-provider']);
    });
  });

  describe('runPipeline', () => {
    it('builds the clinical context and calls supports → insights → recommendations → predictions in order', async () => {
      const calls: string[] = [];
      const provider = buildFakeProvider({
        supports: jest.fn(() => {
          calls.push('supports');
          return true;
        }),
        generateInsights: jest.fn(async () => {
          calls.push('generateInsights');
          return [];
        }),
        generateRecommendations: jest.fn(async () => {
          calls.push('generateRecommendations');
          return [];
        }),
        generatePredictions: jest.fn(async () => {
          calls.push('generatePredictions');
          return [];
        }),
      });
      service.registerProvider(provider);

      const result = await service.runPipeline('patient-1');

      expect(contextBuilder.build).toHaveBeenCalledWith('patient-1', undefined);
      expect(calls).toEqual(['supports', 'generateInsights', 'generateRecommendations', 'generatePredictions']);
      expect(result.patientId).toBe('patient-1');
      expect(result.providersRun).toEqual(['fake-provider']);
      expect(result.results).toHaveLength(1);
    });

    it('skips a provider whose supports() returns false', async () => {
      const provider = buildFakeProvider({ supports: jest.fn().mockReturnValue(false) });
      service.registerProvider(provider);

      const result = await service.runPipeline('patient-1');

      expect(provider.generateInsights).not.toHaveBeenCalled();
      expect(result.providersRun).toEqual([]);
      expect(result.results).toEqual([]);
    });

    it('skips silently when an explicitly requested provider name is not registered', async () => {
      const result = await service.runPipeline('patient-1', { providers: ['unknown-provider'] });

      expect(result.providersRun).toEqual([]);
      expect(result.results).toEqual([]);
    });

    it('only runs the providers listed in options.providers', async () => {
      const a = buildFakeProvider({ name: 'provider-a' });
      const b = buildFakeProvider({ name: 'provider-b' });
      service.registerProvider(a);
      service.registerProvider(b);

      const result = await service.runPipeline('patient-1', { providers: ['provider-a'] });

      expect(result.providersRun).toEqual(['provider-a']);
      expect(b.generateInsights).not.toHaveBeenCalled();
    });

    it('passes windowDays through to the context builder', async () => {
      await service.runPipeline('patient-1', { windowDays: 90 });

      expect(contextBuilder.build).toHaveBeenCalledWith('patient-1', 90);
    });

    it('aggregates insights/recommendations/predictions from multiple providers', async () => {
      const a = buildFakeProvider({
        name: 'provider-a',
        generateInsights: jest.fn().mockResolvedValue([{ insightId: 'i1' }]),
      });
      const b = buildFakeProvider({
        name: 'provider-b',
        generatePredictions: jest.fn().mockResolvedValue([{ predictionType: 'p1' }]),
      });
      service.registerProvider(a);
      service.registerProvider(b);

      const result = await service.runPipeline('patient-1');

      expect(result.results.map((r) => r.provider)).toEqual(['provider-a', 'provider-b']);
      expect(result.results[0].insights).toEqual([{ insightId: 'i1' }]);
      expect(result.results[1].predictions).toEqual([{ predictionType: 'p1' }]);
    });

    // ── Sprint 14.2: Decision Trace / Provenance / error containment ────────

    it('returns a DecisionTrace with steps for context, engine dispatch and the provider run', async () => {
      const provider = buildFakeProvider();
      service.registerProvider(provider);

      const result = await service.runPipeline('patient-1');

      expect(result.trace.patientId).toBe('patient-1');
      expect(result.trace.traceId).toEqual(expect.any(String));
      const stages = result.trace.steps.map((s) => s.stage);
      expect(stages).toEqual(['CLINICAL_CONTEXT', 'DECISION_ENGINE', 'PROVIDER', 'RECOMMENDATION', 'PROVIDER', 'EXPLAINABILITY']);
      expect(result.trace.steps.every((s) => s.status === 'SUCCESS')).toBe(true);
    });

    it('attaches Provenance with SUCCESS status and a shared correlationId when a provider fully succeeds', async () => {
      const provider = buildFakeProvider({ name: 'provider-a', version: '2.3.1' });
      service.registerProvider(provider);

      const result = await service.runPipeline('patient-1');

      expect(result.results[0].provenance).toEqual({
        providerName: 'provider-a',
        providerVersion: '2.3.1',
        executionTimeMs: expect.any(Number),
        executionStatus: 'SUCCESS',
        executionId: `${result.trace.traceId}:provider-a`,
        correlationId: result.trace.traceId,
      });
    });

    it('contains a provider error instead of crashing the whole pipeline, and marks it FAILED when all 3 calls fail', async () => {
      const failing = buildFakeProvider({
        name: 'failing-provider',
        generateInsights: jest.fn().mockRejectedValue(new Error('insights boom')),
        generateRecommendations: jest.fn().mockRejectedValue(new Error('recs boom')),
        generatePredictions: jest.fn().mockRejectedValue(new Error('predictions boom')),
      });
      const healthy = buildFakeProvider({ name: 'healthy-provider' });
      service.registerProvider(failing);
      service.registerProvider(healthy);

      const result = await service.runPipeline('patient-1');

      expect(result.providersRun).toEqual(['failing-provider', 'healthy-provider']);
      const failingResult = result.results.find((r) => r.provider === 'failing-provider')!;
      expect(failingResult.provenance.executionStatus).toBe('FAILED');
      expect(failingResult.insights).toEqual([]);
      expect(failingResult.recommendations).toEqual([]);
      expect(failingResult.predictions).toEqual([]);
      // the healthy provider still ran normally — one provider's failure doesn't stop the pipeline
      expect(healthy.generateInsights).toHaveBeenCalled();
      const healthyResult = result.results.find((r) => r.provider === 'healthy-provider')!;
      expect(healthyResult.provenance.executionStatus).toBe('SUCCESS');
    });

    it('marks a provider PARTIAL when only some of its 3 calls fail', async () => {
      const provider = buildFakeProvider({
        name: 'flaky-provider',
        generateRecommendations: jest.fn().mockRejectedValue(new Error('recs boom')),
      });
      service.registerProvider(provider);

      const result = await service.runPipeline('patient-1');

      expect(result.results[0].provenance.executionStatus).toBe('PARTIAL');
    });

    it('records a FAILED step in the trace for the failed call, without failing the other steps', async () => {
      const provider = buildFakeProvider({
        name: 'flaky-provider',
        generateRecommendations: jest.fn().mockRejectedValue(new Error('recs boom')),
      });
      service.registerProvider(provider);

      const result = await service.runPipeline('patient-1');

      const statuses = result.trace.steps.map((s) => s.status);
      // CLINICAL_CONTEXT, DECISION_ENGINE, PROVIDER(insights), RECOMMENDATION(failed), PROVIDER(predictions), EXPLAINABILITY
      expect(statuses).toEqual(['SUCCESS', 'SUCCESS', 'SUCCESS', 'FAILED', 'SUCCESS', 'PARTIAL']);
    });

    // ── Sprint 14.4: recommendationSet (additive) ────────────────────────────

    const buildCandidate = (overrides: Record<string, unknown> = {}) => ({
      recommendationId: 'rec-1',
      provider: 'fake-provider',
      priority: 'ATENCAO',
      category: 'WELLNESS',
      title: 'Aumentar atividade física',
      description: 'desc',
      rationale: 'rationale',
      actions: ['caminhar mais'],
      explainability: {
        decisionId: 'decision-1',
        confidence: { score: 0.5, level: 'MODERATE', factors: [], missingInformation: [], dataQuality: null, completeness: 0.5 },
        reasoning: 'r',
        evidence: [],
        sourceProvider: 'fake-provider',
        generatedAt: new Date(),
        guidelineReferences: [],
        limitations: [],
        warnings: [],
        metadata: {},
      },
      ...overrides,
    });

    it('consolidates recommendations from all providers into a single recommendationSet', async () => {
      const provider = buildFakeProvider({
        generateRecommendations: jest.fn().mockResolvedValue([buildCandidate()]),
      });
      service.registerProvider(provider);

      const result = await service.runPipeline('patient-1');

      expect(result.recommendationSet.recommendations).toHaveLength(1);
      expect(result.recommendationSet.providerCount).toBe(1);
      expect(result.recommendationSet.statistics.candidatesReceived).toBe(1);
    });

    it('returns an empty recommendationSet when no provider is registered', async () => {
      const result = await service.runPipeline('patient-1');

      expect(result.recommendationSet.recommendations).toEqual([]);
      expect(result.recommendationSet.providerCount).toBe(0);
    });

    it('merges duplicate recommendations across two different providers', async () => {
      const a = buildFakeProvider({
        name: 'provider-a',
        generateRecommendations: jest.fn().mockResolvedValue([
          buildCandidate({ recommendationId: 'a1', provider: 'provider-a', title: 'Aumentar atividade física' }),
        ]),
      });
      const b = buildFakeProvider({
        name: 'provider-b',
        generateRecommendations: jest.fn().mockResolvedValue([
          buildCandidate({ recommendationId: 'b1', provider: 'provider-b', title: 'Aumente a prática de exercícios' }),
        ]),
      });
      service.registerProvider(a);
      service.registerProvider(b);

      const result = await service.runPipeline('patient-1');

      expect(result.recommendationSet.recommendations).toHaveLength(1);
      expect(result.recommendationSet.recommendations[0].sources).toHaveLength(2);
      expect(result.recommendationSet.statistics.duplicatesRemoved).toBe(1);
    });
  });
});
