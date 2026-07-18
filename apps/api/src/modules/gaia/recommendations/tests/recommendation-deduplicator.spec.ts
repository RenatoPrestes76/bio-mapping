import { RecommendationDeduplicator } from '../recommendation-deduplicator';
import { RecommendationCandidate, Explainability } from '../../contracts';

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
    provider: 'fake-provider',
    priority: 'ATENCAO',
    category: 'WELLNESS',
    title: 'title',
    description: 'desc',
    rationale: 'rationale',
    actions: ['action-1'],
    explainability,
    ...overrides,
  };
}

describe('RecommendationDeduplicator', () => {
  let deduplicator: RecommendationDeduplicator;

  beforeEach(() => {
    deduplicator = new RecommendationDeduplicator();
  });

  it('merges "Aumentar atividade física" and "Aumente a prática de exercícios" into one recommendation (Sprint 14.4 example)', () => {
    const a = buildCandidate({
      recommendationId: 'a1',
      provider: 'provider-a',
      title: 'Aumentar atividade física',
      actions: ['Aumentar atividade física gradualmente'],
    });
    const b = buildCandidate({
      recommendationId: 'b1',
      provider: 'provider-b',
      title: 'Aumente a prática de exercícios',
      actions: ['Caminhar mais'],
    });

    const result = deduplicator.deduplicate([a, b]);

    expect(result).toHaveLength(1);
    expect(result[0].recommendationId).toBe('increase-physical-activity');
  });

  it('also matches "caminhar mais" and "mover-se mais" to the same activity concept', () => {
    const a = buildCandidate({ recommendationId: 'a1', title: 'Caminhar mais' });
    const b = buildCandidate({ recommendationId: 'b1', title: 'Mover-se mais' });

    const result = deduplicator.deduplicate([a, b]);

    expect(result).toHaveLength(1);
  });

  it('never merges two candidates that map to no recognized concept, even with identical text', () => {
    const a = buildCandidate({ recommendationId: 'a1', title: 'Xyzzy unrecognized phrase' });
    const b = buildCandidate({ recommendationId: 'b1', title: 'Xyzzy unrecognized phrase' });

    const result = deduplicator.deduplicate([a, b]);

    expect(result).toHaveLength(2);
  });

  it('keeps unrelated concepts (activity vs sleep) as separate recommendations', () => {
    const activity = buildCandidate({ recommendationId: 'a1', title: 'Aumentar atividade física' });
    const sleep = buildCandidate({ recommendationId: 's1', title: 'Melhorar a qualidade do sono' });

    const result = deduplicator.deduplicate([activity, sleep]);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.recommendationId).sort()).toEqual(
      ['improve-sleep-quality', 'increase-physical-activity'].sort(),
    );
  });

  it('merges the actions of all candidates in a group, without duplicating repeated action text', () => {
    const a = buildCandidate({ recommendationId: 'a1', title: 'Aumentar atividade física', actions: ['ação comum', 'ação A'] });
    const b = buildCandidate({ recommendationId: 'b1', title: 'Exercícios', actions: ['ação comum', 'ação B'] });

    const result = deduplicator.deduplicate([a, b]);

    expect(result[0].actions).toEqual(['ação comum', 'ação A', 'ação B']);
  });

  it('preserves every source (provider + original recommendationId + explainability) — Diretriz 7', () => {
    const a = buildCandidate({ recommendationId: 'a1', provider: 'aegis-wellness', title: 'Aumentar atividade física' });
    const b = buildCandidate({ recommendationId: 'b1', provider: 'clinical-risk', title: 'Exercícios regulares' });

    const result = deduplicator.deduplicate([a, b]);

    expect(result[0].sources).toEqual([
      { provider: 'aegis-wellness', recommendationId: 'a1', explainability: a.explainability },
      { provider: 'clinical-risk', recommendationId: 'b1', explainability: b.explainability },
    ]);
  });

  it('wraps a singleton (non-duplicated) candidate with a one-element sources array', () => {
    const solo = buildCandidate({ recommendationId: 'solo-1', title: 'Aumentar atividade física' });

    const result = deduplicator.deduplicate([solo]);

    expect(result[0].sources).toHaveLength(1);
    expect(result[0].sources[0].recommendationId).toBe('solo-1');
  });

  it('falls back to a slug of the title as the stable id when no concept is recognized', () => {
    const solo = buildCandidate({ title: 'Some Unrecognized Título Ção!' });

    const result = deduplicator.deduplicate([solo]);

    expect(result[0].recommendationId).toBe('some-unrecognized-titulo-cao');
  });

  it('returns an empty array for an empty input', () => {
    expect(deduplicator.deduplicate([])).toEqual([]);
  });
});
