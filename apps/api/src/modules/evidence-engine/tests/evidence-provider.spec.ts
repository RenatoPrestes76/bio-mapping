import { EvidenceProvider } from '../providers/evidence.provider.js';
import { EvidenceSource, EvidenceLanguage } from '../entities/evidence.entity.js';
import { BUILT_IN_EVIDENCE } from '../providers/built-in-evidence.js';
import { BUILT_IN_RATINGS } from '../providers/built-in-ratings.js';
import { BUILT_IN_CITATIONS } from '../providers/built-in-citations.js';

describe('EvidenceProvider', () => {
  let provider: EvidenceProvider;

  beforeEach(() => {
    provider = new EvidenceProvider();
  });

  describe('initialization', () => {
    it('loads all built-in evidence', () => {
      expect(provider.count()).toBe(BUILT_IN_EVIDENCE.length);
    });

    it('loads all built-in citations', () => {
      expect(provider.citationCount()).toBe(BUILT_IN_CITATIONS.length);
    });

    it('has a rating for every built-in evidence', () => {
      for (const ev of BUILT_IN_EVIDENCE) {
        expect(provider.getRating(ev.id)).toBeDefined();
      }
    });

    it('number of ratings matches built-in ratings', () => {
      let ratingCount = 0;
      for (const ev of BUILT_IN_EVIDENCE) {
        if (provider.getRating(ev.id)) ratingCount++;
      }
      expect(ratingCount).toBe(BUILT_IN_RATINGS.length);
    });
  });

  describe('loadEvidence (reload)', () => {
    it('resets and reloads evidence', () => {
      provider.loadEvidence();
      expect(provider.count()).toBe(BUILT_IN_EVIDENCE.length);
    });

    it('clears cache on reload', () => {
      provider.searchEvidence('statin');
      provider.loadEvidence();
      // After reload, cache is cleared — search still works correctly
      expect(provider.count()).toBeGreaterThan(0);
    });
  });

  describe('searchEvidence', () => {
    it('returns all evidence for empty query', () => {
      expect(provider.searchEvidence('')).toHaveLength(BUILT_IN_EVIDENCE.length);
    });

    it('returns all for whitespace query', () => {
      expect(provider.searchEvidence('   ')).toHaveLength(BUILT_IN_EVIDENCE.length);
    });

    it('filters by keyword', () => {
      const results = provider.searchEvidence('statin');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((e) => e.matchesQuery('statin'))).toBe(true);
    });

    it('is case-insensitive', () => {
      const lower = provider.searchEvidence('statin');
      const upper = provider.searchEvidence('STATIN');
      expect(lower.length).toBe(upper.length);
    });

    it('filters by source', () => {
      const results = provider.searchEvidence('', EvidenceSource.COCHRANE);
      expect(results.every((e) => e.source === EvidenceSource.COCHRANE)).toBe(true);
    });

    it('filters by language', () => {
      const results = provider.searchEvidence('', undefined, EvidenceLanguage.EN);
      expect(results.every((e) => e.language === EvidenceLanguage.EN)).toBe(true);
    });

    it('caches results on second call', () => {
      const r1 = provider.searchEvidence('diabetes');
      const r2 = provider.searchEvidence('diabetes');
      expect(r1).toBe(r2);
    });

    it('returns empty for unmatched query', () => {
      expect(provider.searchEvidence('nonexistent_xyz_study_2999')).toHaveLength(0);
    });

    it('deduplicates by DOI', () => {
      // All built-in evidence should have unique DOIs → no duplicates after dedup
      const results = provider.searchEvidence('');
      expect(results.length).toBe(BUILT_IN_EVIDENCE.length);
    });
  });

  describe('findByTopic', () => {
    it('returns evidence matching topic', () => {
      const results = provider.findByTopic('cardiovascular');
      expect(results.length).toBeGreaterThan(0);
    });

    it('caches results', () => {
      const r1 = provider.findByTopic('diabetes');
      const r2 = provider.findByTopic('diabetes');
      expect(r1).toBe(r2);
    });
  });

  describe('findByCondition', () => {
    it('returns evidence for condition', () => {
      const results = provider.findByCondition('diabetes');
      expect(results.length).toBeGreaterThan(0);
    });

    it('returns empty for unknown condition', () => {
      expect(provider.findByCondition('zzznonexistent')).toHaveLength(0);
    });
  });

  describe('findByGuideline', () => {
    it('returns evidence linked to a guideline', () => {
      const results = provider.findByGuideline('gl-sbc-2020');
      expect(results.length).toBeGreaterThan(0);
    });

    it('returns empty for unknown guideline', () => {
      expect(provider.findByGuideline('gl-unknown-999')).toHaveLength(0);
    });

    it('caches results', () => {
      const r1 = provider.findByGuideline('gl-sbc-2020');
      const r2 = provider.findByGuideline('gl-sbc-2020');
      expect(r1).toBe(r2);
    });
  });

  describe('findRelatedEvidence', () => {
    it('returns related evidence for known id', () => {
      const related = provider.findRelatedEvidence('ev-statin-meta-2022');
      expect(related.length).toBeGreaterThan(0);
    });

    it('excludes the source evidence itself', () => {
      const related = provider.findRelatedEvidence('ev-statin-meta-2022');
      expect(related.every((e) => e.id !== 'ev-statin-meta-2022')).toBe(true);
    });

    it('returns empty for unknown id', () => {
      expect(provider.findRelatedEvidence('unknown-evidence-id')).toHaveLength(0);
    });

    it('caches results', () => {
      const r1 = provider.findRelatedEvidence('ev-statin-meta-2022');
      const r2 = provider.findRelatedEvidence('ev-statin-meta-2022');
      expect(r1).toBe(r2);
    });
  });

  describe('rankEvidence', () => {
    it('returns ranked list for all evidence', () => {
      const ranked = provider.rankEvidence();
      expect(ranked.length).toBe(BUILT_IN_EVIDENCE.length);
    });

    it('results sorted descending by totalScore', () => {
      const ranked = provider.rankEvidence();
      for (let i = 1; i < ranked.length; i++) {
        expect(ranked[i - 1].totalScore).toBeGreaterThanOrEqual(ranked[i].totalScore);
      }
    });

    it('each item has evidence, rating, grading, totalScore', () => {
      const ranked = provider.rankEvidence();
      ranked.forEach((r) => {
        expect(r.evidence).toBeDefined();
        expect(r.rating).toBeDefined();
        expect(r.grading).toBeDefined();
        expect(typeof r.totalScore).toBe('number');
      });
    });

    it('accepts subset of evidence items', () => {
      const subset = [BUILT_IN_EVIDENCE[0]];
      const ranked = provider.rankEvidence(subset);
      expect(ranked.length).toBe(1);
    });
  });

  describe('getById', () => {
    it('returns evidence by id', () => {
      const ev = provider.getById('ev-statin-meta-2022');
      expect(ev).toBeDefined();
      expect(ev!.source).toBe(EvidenceSource.META_ANALYSIS);
    });

    it('returns undefined for unknown id', () => {
      expect(provider.getById('unknown-id')).toBeUndefined();
    });
  });

  describe('citations', () => {
    it('getCitationsForEvidence returns citations', () => {
      const citations = provider.getCitationsForEvidence('ev-statin-meta-2022');
      expect(citations.length).toBeGreaterThan(0);
    });

    it('getCitationsForRule returns citations for rule', () => {
      const citations = provider.getCitationsForRule('rule-card-001');
      expect(citations.length).toBeGreaterThan(0);
    });

    it('getCitationsForGuideline returns citations for guideline', () => {
      const citations = provider.getCitationsForGuideline('gl-sbc-2020');
      expect(citations.length).toBeGreaterThan(0);
    });

    it('returns empty for unknown rule', () => {
      expect(provider.getCitationsForRule('rule-unknown-999')).toHaveLength(0);
    });
  });

  describe('clearCache', () => {
    it('allows re-computation after clear', () => {
      const r1 = provider.searchEvidence('statin');
      provider.clearCache();
      const r2 = provider.searchEvidence('statin');
      expect(r1.length).toBe(r2.length);
    });
  });
});
