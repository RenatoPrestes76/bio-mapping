import { Test, TestingModule } from '@nestjs/testing';
import { DecisionEngineService } from '../decision-engine.service';
import { ClinicalContextBuilder } from '../clinical-context.builder';
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
    supports: jest.fn().mockReturnValue(true),
    generateInsights: jest.fn().mockResolvedValue([]),
    generateRecommendations: jest.fn().mockResolvedValue([]),
    generatePredictions: jest.fn().mockResolvedValue([]),
    ...overrides,
  });

  beforeEach(async () => {
    contextBuilder = { build: jest.fn().mockResolvedValue(baseContext) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DecisionEngineService, { provide: ClinicalContextBuilder, useValue: contextBuilder }],
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
  });
});
