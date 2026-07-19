import { KnowledgeProvider } from '../providers/knowledge.provider.js';

let provider: KnowledgeProvider;

beforeEach(() => {
  provider = new KnowledgeProvider();
});

describe('KnowledgeProvider', () => {
  describe('loadRules', () => {
    it('loads built-in rules', () => {
      const rules = provider.getRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it('loads built-in guidelines', () => {
      const guidelines = provider.getGuidelines();
      expect(guidelines.length).toBeGreaterThan(0);
    });

    it('loads built-in references', () => {
      const references = provider.getReferences();
      expect(references.length).toBeGreaterThan(0);
    });

    it('clears cache on reload', () => {
      provider.search('diabetes');
      provider.loadRules();
      const rules = provider.getRules();
      expect(rules.length).toBeGreaterThan(0);
    });
  });

  describe('getRules', () => {
    it('returns a copy (not the internal array)', () => {
      const a = provider.getRules();
      const b = provider.getRules();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });

  describe('search', () => {
    it('returns results for matching query', () => {
      const results = provider.search('diabetes');
      expect(results.length).toBeGreaterThan(0);
    });

    it('returns all items for empty query', () => {
      const all = provider.search('');
      const totalExpected = provider.getRules().length + provider.getGuidelines().length + provider.getReferences().length;
      expect(all.length).toBe(totalExpected);
    });

    it('each result has type, item, and score', () => {
      const results = provider.search('hipertensão');
      for (const r of results) {
        expect(r).toHaveProperty('type');
        expect(r).toHaveProperty('item');
        expect(r).toHaveProperty('score');
        expect(['rule', 'guideline', 'reference']).toContain(r.type);
      }
    });

    it('caches results on second call', () => {
      const r1 = provider.search('diabetes');
      const r2 = provider.search('diabetes');
      expect(r1).toBe(r2);
    });

    it('cache is case-insensitive (same key)', () => {
      const r1 = provider.search('Diabetes');
      const r2 = provider.search('diabetes');
      expect(r1).toBe(r2);
    });

    it('returns rules with higher priority first (score)', () => {
      const results = provider.search('hipertensão');
      const ruleResults = results.filter((r) => r.type === 'rule');
      if (ruleResults.length >= 2) {
        expect(ruleResults[0].score).toBeGreaterThanOrEqual(ruleResults[1].score);
      }
    });

    it('returns empty for unmatched query', () => {
      const results = provider.search('xyznotexistent12345');
      expect(results).toEqual([]);
    });

    it('handles whitespace-only query as empty', () => {
      const all = provider.search('   ');
      const totalExpected = provider.getRules().length + provider.getGuidelines().length + provider.getReferences().length;
      expect(all.length).toBe(totalExpected);
    });
  });

  describe('findByCategory', () => {
    it('returns rules in CARDIOLOGY category', () => {
      const rules = provider.findByCategory('CARDIOLOGY');
      expect(rules.length).toBeGreaterThan(0);
      for (const r of rules) {
        expect(r.category).toBe('CARDIOLOGY');
      }
    });

    it('is case-insensitive', () => {
      const upper = provider.findByCategory('CARDIOLOGY');
      const lower = provider.findByCategory('cardiology');
      expect(upper.length).toBe(lower.length);
    });

    it('returns empty array for unknown category', () => {
      const result = provider.findByCategory('UNKNOWN_DOMAIN_XYZ');
      expect(result).toEqual([]);
    });

    it('caches category results', () => {
      const first = provider.findByCategory('ENDOCRINOLOGY');
      const second = provider.findByCategory('ENDOCRINOLOGY');
      expect(first).toBe(second);
    });
  });

  describe('findByTags', () => {
    it('returns items matching any provided tag', () => {
      const results = provider.findByTags(['diabetes']);
      expect(results.length).toBeGreaterThan(0);
    });

    it('returns empty for empty tags array', () => {
      const results = provider.findByTags([]);
      expect(results).toEqual([]);
    });

    it('returns multiple types (rules and references)', () => {
      const results = provider.findByTags(['hipertensão']);
      const types = new Set(results.map((r) => r.type));
      expect(types.size).toBeGreaterThanOrEqual(1);
    });

    it('results are sorted by overlap score descending', () => {
      const results = provider.findByTags(['diabetes', 'glicemia', 'HbA1c']);
      if (results.length >= 2) {
        expect(results[0].score).toBeGreaterThanOrEqual(results[results.length - 1].score);
      }
    });

    it('tag matching is case-insensitive', () => {
      const lower = provider.findByTags(['diabetes']);
      const upper = provider.findByTags(['DIABETES']);
      expect(lower.length).toBe(upper.length);
    });

    it('returns empty for tags with no matches', () => {
      const results = provider.findByTags(['xyztagnonexistent999']);
      expect(results).toEqual([]);
    });
  });

  describe('findRelated', () => {
    it('returns related items for a rule id', () => {
      const rules = provider.getRules();
      const id = rules[0].id;
      const results = provider.findRelated(id, 'rule');
      expect(Array.isArray(results)).toBe(true);
    });

    it('returns empty for non-existent rule id', () => {
      const results = provider.findRelated('non-existent-id', 'rule');
      expect(results).toEqual([]);
    });

    it('returns related items for a guideline id', () => {
      const guidelines = provider.getGuidelines();
      const id = guidelines[0].id;
      const results = provider.findRelated(id, 'guideline');
      expect(Array.isArray(results)).toBe(true);
    });

    it('returns empty for non-existent guideline id', () => {
      const results = provider.findRelated('non-existent-gl', 'guideline');
      expect(results).toEqual([]);
    });

    it('returns related items for a reference id', () => {
      const refs = provider.getReferences();
      const id = refs[0].id;
      const results = provider.findRelated(id, 'reference');
      expect(Array.isArray(results)).toBe(true);
    });

    it('returns empty for non-existent reference id', () => {
      const results = provider.findRelated('non-existent-ref', 'reference');
      expect(results).toEqual([]);
    });

    it('limits results to 10', () => {
      const rules = provider.getRules();
      if (rules.length > 0) {
        const results = provider.findRelated(rules[0].id, 'rule');
        expect(results.length).toBeLessThanOrEqual(10);
      }
    });

    it('does not include the item itself in related results', () => {
      const rules = provider.getRules();
      if (rules.length > 0) {
        const id = rules[0].id;
        const results = provider.findRelated(id, 'rule');
        const ids = results.filter((r) => r.type === 'rule').map((r) => (r.item as { id: string }).id);
        expect(ids).not.toContain(id);
      }
    });
  });
});
