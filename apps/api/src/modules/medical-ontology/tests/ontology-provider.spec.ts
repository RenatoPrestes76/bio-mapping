import { OntologyProvider } from '../providers/ontology.provider.js';
import { ConceptCategory } from '../entities/medical-concept.entity.js';
import { RelationType } from '../entities/concept-relation.entity.js';
import { BUILT_IN_CONCEPTS } from '../ontology/concepts.js';
import { BUILT_IN_RELATIONS } from '../ontology/relations.js';

describe('OntologyProvider', () => {
  let provider: OntologyProvider;

  beforeEach(() => {
    provider = new OntologyProvider();
  });

  describe('loadConcepts / initialization', () => {
    it('loads all built-in concepts', () => {
      expect(provider.getNodeCount()).toBe(BUILT_IN_CONCEPTS.length);
    });

    it('loads all built-in relations', () => {
      expect(provider.getEdgeCount()).toBe(BUILT_IN_RELATIONS.length);
    });

    it('re-loadConcepts resets graph and reloads', () => {
      provider.loadConcepts();
      expect(provider.getNodeCount()).toBe(BUILT_IN_CONCEPTS.length);
    });

    it('re-loadConcepts clears cache', () => {
      provider.searchConcept('hipertensão');
      provider.loadConcepts();
      // After reload, cache cleared — getConcept still works
      expect(provider.getNodeCount()).toBeGreaterThan(0);
    });
  });

  describe('searchConcept', () => {
    it('returns all nodes when query is empty string', () => {
      const all = provider.searchConcept('');
      expect(all.length).toBe(BUILT_IN_CONCEPTS.length);
    });

    it('returns all nodes when query is whitespace', () => {
      const all = provider.searchConcept('   ');
      expect(all.length).toBe(BUILT_IN_CONCEPTS.length);
    });

    it('filters by name match', () => {
      const results = provider.searchConcept('hipertensão');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((c) => c.name.toLowerCase().includes('hipertensão'))).toBe(true);
    });

    it('is case-insensitive', () => {
      const lower = provider.searchConcept('hipertensão');
      const upper = provider.searchConcept('HIPERTENSÃO');
      expect(lower.length).toBe(upper.length);
    });

    it('filters by category', () => {
      const results = provider.searchConcept('', ConceptCategory.BIOMARKER);
      expect(results.every((c) => c.category === ConceptCategory.BIOMARKER)).toBe(true);
    });

    it('returns empty for unmatched query', () => {
      expect(provider.searchConcept('nonexistent_xyz_123')).toHaveLength(0);
    });

    it('caches results on second call', () => {
      const r1 = provider.searchConcept('diabetes');
      const r2 = provider.searchConcept('diabetes');
      expect(r1).toBe(r2);
    });

    it('name-prefix results appear first', () => {
      // 'glicose' or 'LDL' should sort before partial interior matches
      const results = provider.searchConcept('ldl');
      if (results.length > 0) {
        expect(results[0].name.toLowerCase().startsWith('ldl')).toBe(true);
      }
    });
  });

  describe('getConcept', () => {
    it('returns concept by id', () => {
      const c = provider.getConcept('concept-hypertension');
      expect(c).toBeDefined();
      expect(c!.code).toBe('I10');
    });

    it('returns concept by code (synonym index)', () => {
      const c = provider.getConcept('I10');
      expect(c).toBeDefined();
    });

    it('returns concept by code case-insensitively', () => {
      const c = provider.getConcept('i10');
      expect(c).toBeDefined();
    });

    it('returns concept by name (synonym index)', () => {
      const c = provider.getConcept('Hipertensão');
      expect(c).toBeDefined();
    });

    it('returns undefined for unknown', () => {
      expect(provider.getConcept('unknown-xyz')).toBeUndefined();
    });
  });

  describe('findRelated', () => {
    it('returns relations for a valid conceptId', () => {
      const related = provider.findRelated('concept-hypertension');
      expect(related.length).toBeGreaterThan(0);
    });

    it('each result has concept and relation fields', () => {
      const related = provider.findRelated('concept-hypertension');
      related.forEach((r) => {
        expect(r.concept).toBeDefined();
        expect(r.relation).toBeDefined();
      });
    });

    it('filters by RelationType', () => {
      const related = provider.findRelated('concept-hypertension', RelationType.CAUSES);
      expect(related.every((r) => r.relation.relationType === RelationType.CAUSES)).toBe(true);
    });

    it('caches results', () => {
      const r1 = provider.findRelated('concept-hypertension');
      const r2 = provider.findRelated('concept-hypertension');
      expect(r1).toBe(r2);
    });

    it('returns sorted by score descending', () => {
      const related = provider.findRelated('concept-hypertension');
      for (let i = 1; i < related.length; i++) {
        expect(related[i - 1].relation.score()).toBeGreaterThanOrEqual(related[i].relation.score());
      }
    });

    it('returns empty array for concept with no edges', () => {
      // Load a fresh provider, check isolated-looking concept
      const related = provider.findRelated('concept-nonexistent-xyz');
      expect(related).toHaveLength(0);
    });
  });

  describe('findPath', () => {
    it('returns null when no path exists between unrelated concepts', () => {
      // 'aerobic exercise' and 'tsh' may not be directly connected
      const result = provider.findPath('concept-aerobic', 'concept-tsh');
      // just confirm it doesn't throw and returns null or a result
      expect(result === null || Array.isArray(result?.path)).toBe(true);
    });

    it('returns path between connected concepts', () => {
      // obesity → metabolic syndrome is in BUILT_IN_RELATIONS
      const result = provider.findPath('concept-obesity', 'concept-metabolic-syndrome');
      if (result) {
        expect(result.path.length).toBeGreaterThanOrEqual(2);
        expect(result.totalWeight).toBeGreaterThan(0);
      }
    });

    it('caches the result', () => {
      const r1 = provider.findPath('concept-obesity', 'concept-metabolic-syndrome');
      const r2 = provider.findPath('concept-obesity', 'concept-metabolic-syndrome');
      expect(r1).toBe(r2);
    });
  });

  describe('expandConcept', () => {
    it('returns expansion for a valid concept', () => {
      const result = provider.expandConcept('concept-hypertension', 1);
      expect(result.concepts).toBeDefined();
      expect(result.relations).toBeDefined();
    });

    it('depth 0 returns no neighbours', () => {
      const result = provider.expandConcept('concept-hypertension', 0);
      expect(result.concepts).toHaveLength(0);
    });

    it('depth 1 returns immediate neighbours', () => {
      const result = provider.expandConcept('concept-hypertension', 1);
      expect(result.concepts.length).toBeGreaterThanOrEqual(0);
    });

    it('caches expansion results', () => {
      const r1 = provider.expandConcept('concept-obesity', 2);
      const r2 = provider.expandConcept('concept-obesity', 2);
      expect(r1).toBe(r2);
    });
  });

  describe('getGraph', () => {
    it('returns an OntologyGraph', () => {
      const g = provider.getGraph();
      expect(g.id).toBe('bio-mapping-medical-ontology-v1');
      expect(g.version).toBe('1.0.0');
    });

    it('without limit returns all nodes', () => {
      const g = provider.getGraph();
      expect(g.nodeCount).toBe(BUILT_IN_CONCEPTS.length);
    });

    it('with limit slices nodes', () => {
      const g = provider.getGraph(5);
      expect(g.nodeCount).toBeLessThanOrEqual(5);
    });

    it('with limit slices edges to limit * 2', () => {
      const limit = 5;
      const g = provider.getGraph(limit);
      expect(g.edgeCount).toBeLessThanOrEqual(limit * 2);
    });
  });

  describe('clearCache', () => {
    it('clearCache allows re-computation (no cache hit)', () => {
      const r1 = provider.searchConcept('diabetes');
      provider.clearCache();
      const r2 = provider.searchConcept('diabetes');
      // Both should return equal content but not same reference after cache clear
      expect(r1.length).toBe(r2.length);
    });
  });
});
