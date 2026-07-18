import { RecommendationRegistry } from '../recommendation-registry';
import { RecommendationStrategy } from '../recommendation.types';

function buildStrategy(overrides: Partial<RecommendationStrategy> = {}): RecommendationStrategy {
  return { domain: 'WELLNESS', name: 'wellness-default', priorityWeight: 0, ...overrides };
}

describe('RecommendationRegistry', () => {
  let registry: RecommendationRegistry;

  beforeEach(() => {
    registry = new RecommendationRegistry();
  });

  it('registers a domain-only strategy (topic omitted) and retrieves it by domain', () => {
    const strategy = buildStrategy();
    registry.register(strategy);

    expect(registry.get('WELLNESS')).toBe(strategy);
  });

  it('registers a topic-only strategy under domain "*" and retrieves it by topic', () => {
    const strategy = buildStrategy({ domain: '*', topic: 'METABOLIC', name: 'metabolic-default' });
    registry.register(strategy);

    expect(registry.get('*', 'METABOLIC')).toBe(strategy);
  });

  it('returns undefined for an unregistered domain/topic', () => {
    expect(registry.get('LABORATORY')).toBeUndefined();
  });

  it('resolveForCategory finds a domain-level strategy when category is a known domain', () => {
    const strategy = buildStrategy({ domain: 'WELLNESS' });
    registry.register(strategy);

    expect(registry.resolveForCategory('WELLNESS')).toBe(strategy);
    expect(registry.resolveForCategory('wellness')).toBe(strategy); // case-insensitive
  });

  it('resolveForCategory finds a topic-level strategy when category is not a known domain', () => {
    const strategy = buildStrategy({ domain: '*', topic: 'METABOLIC', name: 'metabolic-default' });
    registry.register(strategy);

    expect(registry.resolveForCategory('METABOLIC')).toBe(strategy);
  });

  it('resolveForCategory returns undefined when nothing matches', () => {
    expect(registry.resolveForCategory('CARDIOVASCULAR')).toBeUndefined();
  });

  it('list() returns every registered strategy', () => {
    registry.register(buildStrategy({ domain: 'WELLNESS' }));
    registry.register(buildStrategy({ domain: '*', topic: 'METABOLIC', name: 'metabolic-default' }));

    expect(registry.list()).toHaveLength(2);
  });

  it('re-registering the same domain/topic overwrites the previous strategy', () => {
    registry.register(buildStrategy({ priorityWeight: 1 }));
    registry.register(buildStrategy({ priorityWeight: 5 }));

    expect(registry.get('WELLNESS')?.priorityWeight).toBe(5);
    expect(registry.list()).toHaveLength(1);
  });
});
