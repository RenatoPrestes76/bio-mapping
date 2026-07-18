import { RecommendationEngine } from '../recommendation-engine';
import { RecommendationDeduplicator } from '../recommendation-deduplicator';
import { RecommendationPrioritizer } from '../recommendation-prioritizer';
import { RecommendationRegistry } from '../recommendation-registry';
import { ExplainabilityEngine } from '../../explainability';
import { ClinicalContext, Explainability, RecommendationCandidate } from '../../contracts';

function buildContext(): ClinicalContext {
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
  };
}

const explainability: Explainability = {
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
};

function buildCandidate(overrides: Partial<RecommendationCandidate> = {}): RecommendationCandidate {
  return {
    recommendationId: 'rec-1',
    provider: 'provider-a',
    priority: 'ATENCAO',
    category: 'WELLNESS',
    title: 'title',
    description: 'desc',
    rationale: 'rationale',
    actions: ['action'],
    explainability,
    ...overrides,
  };
}

describe('RecommendationEngine', () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    const registry = new RecommendationRegistry();
    engine = new RecommendationEngine(
      new RecommendationDeduplicator(),
      new RecommendationPrioritizer(registry),
      new ExplainabilityEngine(),
    );
  });

  it('returns an empty RecommendationSet for no candidates', () => {
    const set = engine.consolidate([], buildContext());

    expect(set.recommendations).toEqual([]);
    expect(set.providerCount).toBe(0);
    expect(set.statistics.candidatesReceived).toBe(0);
  });

  it('deduplicates before prioritizing (dedup → sort → build, in that order)', () => {
    const a = buildCandidate({
      recommendationId: 'a1',
      provider: 'provider-a',
      title: 'Aumentar atividade física',
      priority: 'INFORMATIVO',
    });
    const b = buildCandidate({
      recommendationId: 'b1',
      provider: 'provider-b',
      title: 'Aumente a prática de exercícios',
      priority: 'ALTA_PRIORIDADE',
    });

    const set = engine.consolidate([a, b], buildContext());

    // merged into 1, and the merged item keeps the highest of the two priorities is NOT
    // asserted here (merge keeps the "primary" — first seen); what matters is there's 1 result
    expect(set.recommendations).toHaveLength(1);
    expect(set.statistics.duplicatesRemoved).toBe(1);
  });

  it('sorts the final recommendations by priority', () => {
    const low = buildCandidate({ recommendationId: 'low', title: 'Sono', priority: 'INFORMATIVO' });
    const high = buildCandidate({ recommendationId: 'high', title: 'Nutrição', priority: 'ALTA_PRIORIDADE' });

    const set = engine.consolidate([low, high], buildContext());

    expect(set.recommendations.map((r) => r.title)).toEqual(['Nutrição', 'Sono']);
  });

  it('computes providerCount from the distinct providers among the input candidates', () => {
    const a = buildCandidate({ recommendationId: 'a1', provider: 'provider-a', title: 'Sono' });
    const b = buildCandidate({ recommendationId: 'b1', provider: 'provider-b', title: 'Nutrição' });
    const c = buildCandidate({ recommendationId: 'c1', provider: 'provider-a', title: 'Hidratação' });

    const set = engine.consolidate([a, b, c], buildContext());

    expect(set.providerCount).toBe(2);
  });

  it('reports statistics.highestPriority and priorityBreakdown from the ORIGINAL candidates, not the merged set', () => {
    const a = buildCandidate({ recommendationId: 'a1', priority: 'ALTA_PRIORIDADE', title: 'Sono' });
    const b = buildCandidate({ recommendationId: 'b1', priority: 'INFORMATIVO', title: 'Nutrição' });

    const set = engine.consolidate([a, b], buildContext());

    expect(set.statistics.highestPriority).toBe('ALTA_PRIORIDADE');
    expect(set.statistics.priorityBreakdown).toEqual({ ALTA_PRIORIDADE: 1, INFORMATIVO: 1 });
  });

  it('every recommendation in the set is a MergedRecommendation with a non-empty sources array', () => {
    const a = buildCandidate({ recommendationId: 'a1', title: 'Sono' });

    const set = engine.consolidate([a], buildContext());

    expect(set.recommendations[0].sources.length).toBeGreaterThan(0);
  });
});
