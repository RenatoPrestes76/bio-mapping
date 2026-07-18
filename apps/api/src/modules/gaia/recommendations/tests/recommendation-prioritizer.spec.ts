import { RecommendationPrioritizer } from '../recommendation-prioritizer';
import { RecommendationRegistry } from '../recommendation-registry';
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
    actions: [],
    explainability,
    ...overrides,
  };
}

describe('RecommendationPrioritizer', () => {
  let registry: RecommendationRegistry;
  let prioritizer: RecommendationPrioritizer;

  beforeEach(() => {
    registry = new RecommendationRegistry();
    prioritizer = new RecommendationPrioritizer(registry);
  });

  describe('sort', () => {
    it('orders ALTA_PRIORIDADE > IMPORTANTE > ATENCAO > INFORMATIVO', () => {
      const candidates = [
        buildCandidate({ recommendationId: 'low', priority: 'INFORMATIVO' }),
        buildCandidate({ recommendationId: 'critical', priority: 'ALTA_PRIORIDADE' }),
        buildCandidate({ recommendationId: 'medium', priority: 'ATENCAO' }),
        buildCandidate({ recommendationId: 'high', priority: 'IMPORTANTE' }),
      ];

      const sorted = prioritizer.sort(candidates);

      expect(sorted.map((c) => c.recommendationId)).toEqual(['critical', 'high', 'medium', 'low']);
    });

    it('accepts CRITICAL/HIGH/MEDIUM/LOW as synonyms of the Portuguese vocabulary (Diretriz 4)', () => {
      const candidates = [
        buildCandidate({ recommendationId: 'low', priority: 'LOW' }),
        buildCandidate({ recommendationId: 'critical', priority: 'CRITICAL' }),
      ];

      const sorted = prioritizer.sort(candidates);

      expect(sorted.map((c) => c.recommendationId)).toEqual(['critical', 'low']);
    });

    it('treats an unknown priority as rank 0 (lowest)', () => {
      const candidates = [
        buildCandidate({ recommendationId: 'unknown', priority: 'SOMETHING_ELSE' }),
        buildCandidate({ recommendationId: 'known', priority: 'INFORMATIVO' }),
      ];

      const sorted = prioritizer.sort(candidates);

      expect(sorted.map((c) => c.recommendationId)).toEqual(['known', 'unknown']);
    });

    it('does not mutate the input array', () => {
      const candidates = [buildCandidate({ recommendationId: 'a', priority: 'INFORMATIVO' }), buildCandidate({ recommendationId: 'b', priority: 'ALTA_PRIORIDADE' })];
      const original = [...candidates];

      prioritizer.sort(candidates);

      expect(candidates).toEqual(original);
    });

    it('uses the registered strategy priorityWeight as a tiebreaker when ranks are equal', () => {
      registry.register({ domain: 'WELLNESS', name: 'wellness', priorityWeight: 1 });
      registry.register({ domain: '*', topic: 'METABOLIC', name: 'metabolic', priorityWeight: 5 });

      const candidates = [
        buildCandidate({ recommendationId: 'wellness-item', category: 'WELLNESS', priority: 'ATENCAO' }),
        buildCandidate({ recommendationId: 'metabolic-item', category: 'METABOLIC', priority: 'ATENCAO' }),
      ];

      const sorted = prioritizer.sort(candidates);

      expect(sorted.map((c) => c.recommendationId)).toEqual(['metabolic-item', 'wellness-item']);
    });

    it('defaults to priorityWeight 0 when no strategy is registered for the category', () => {
      const candidates = [
        buildCandidate({ recommendationId: 'a', category: 'UNREGISTERED', priority: 'ATENCAO' }),
        buildCandidate({ recommendationId: 'b', category: 'ALSO_UNREGISTERED', priority: 'ATENCAO' }),
      ];

      expect(() => prioritizer.sort(candidates)).not.toThrow();
    });
  });

  describe('highestPriority', () => {
    it('returns the highest-ranked priority present', () => {
      const candidates = [
        buildCandidate({ priority: 'INFORMATIVO' }),
        buildCandidate({ priority: 'IMPORTANTE' }),
      ];

      expect(prioritizer.highestPriority(candidates)).toBe('IMPORTANTE');
    });

    it('returns LOW for an empty list', () => {
      expect(prioritizer.highestPriority([])).toBe('LOW');
    });
  });

  describe('breakdown', () => {
    it('counts candidates per priority value', () => {
      const candidates = [
        buildCandidate({ priority: 'ATENCAO' }),
        buildCandidate({ priority: 'ATENCAO' }),
        buildCandidate({ priority: 'IMPORTANTE' }),
      ];

      expect(prioritizer.breakdown(candidates)).toEqual({ ATENCAO: 2, IMPORTANTE: 1 });
    });
  });
});
