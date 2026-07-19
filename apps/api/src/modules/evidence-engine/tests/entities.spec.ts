import { Evidence, EvidenceSource, EvidenceLanguage } from '../entities/evidence.entity.js';
import { EvidenceRating, GradeQuality, RecommendationStrength, RiskOfBias } from '../entities/evidence-rating.entity.js';
import { ClinicalCitation } from '../entities/clinical-citation.entity.js';

describe('Evidence', () => {
  const base = {
    id: 'ev1',
    title: 'Statin meta-analysis',
    abstract: 'LDL reduction meta-analysis',
    authors: ['Smith J', 'Jones A'],
    journal: 'The Lancet',
    publicationDate: '2022-01-01',
    source: EvidenceSource.META_ANALYSIS,
  };

  it('sets all required fields', () => {
    const ev = new Evidence(base);
    expect(ev.id).toBe('ev1');
    expect(ev.title).toBe('Statin meta-analysis');
    expect(ev.authors).toEqual(['Smith J', 'Jones A']);
    expect(ev.journal).toBe('The Lancet');
    expect(ev.source).toBe(EvidenceSource.META_ANALYSIS);
  });

  it('parses string publicationDate to Date', () => {
    const ev = new Evidence(base);
    expect(ev.publicationDate).toBeInstanceOf(Date);
  });

  it('accepts Date object publicationDate', () => {
    const d = new Date('2022-01-01');
    const ev = new Evidence({ ...base, publicationDate: d });
    expect(ev.publicationDate).toBe(d);
  });

  it('defaults language to EN', () => {
    expect(new Evidence(base).language).toBe(EvidenceLanguage.EN);
  });

  it('stores provided language', () => {
    expect(new Evidence({ ...base, language: EvidenceLanguage.PT }).language).toBe(EvidenceLanguage.PT);
  });

  it('defaults keywords to empty array', () => {
    expect(new Evidence(base).keywords).toEqual([]);
  });

  it('stores keywords', () => {
    const ev = new Evidence({ ...base, keywords: ['statins', 'cardiovascular'] });
    expect(ev.keywords).toContain('statins');
  });

  it('stores doi and pmid', () => {
    const ev = new Evidence({ ...base, doi: '10.1016/X', pmid: '12345' });
    expect(ev.doi).toBe('10.1016/X');
    expect(ev.pmid).toBe('12345');
  });

  it('stores metadata', () => {
    const ev = new Evidence({ ...base, metadata: { sampleSize: 1000 } });
    expect(ev.metadata?.sampleSize).toBe(1000);
  });

  describe('matchesQuery', () => {
    it('matches on title', () => {
      expect(new Evidence(base).matchesQuery('Statin')).toBe(true);
    });

    it('matches on abstract', () => {
      expect(new Evidence(base).matchesQuery('LDL reduction')).toBe(true);
    });

    it('matches on journal', () => {
      expect(new Evidence(base).matchesQuery('Lancet')).toBe(true);
    });

    it('matches on author', () => {
      expect(new Evidence(base).matchesQuery('Smith')).toBe(true);
    });

    it('matches on keyword', () => {
      const ev = new Evidence({ ...base, keywords: ['cholesterol'] });
      expect(ev.matchesQuery('cholesterol')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(new Evidence(base).matchesQuery('STATIN')).toBe(true);
    });

    it('returns false for no match', () => {
      expect(new Evidence(base).matchesQuery('oncologia')).toBe(false);
    });
  });

  describe('matchesKeywords', () => {
    it('returns true for shared keyword', () => {
      const ev = new Evidence({ ...base, keywords: ['statins', 'LDL'] });
      expect(ev.matchesKeywords(['LDL'])).toBe(true);
    });

    it('returns false for no overlap', () => {
      const ev = new Evidence({ ...base, keywords: ['statins'] });
      expect(ev.matchesKeywords(['diabetes'])).toBe(false);
    });

    it('is case-insensitive', () => {
      const ev = new Evidence({ ...base, keywords: ['Statins'] });
      expect(ev.matchesKeywords(['statins'])).toBe(true);
    });
  });

  describe('isRecent', () => {
    it('returns true for recent evidence', () => {
      const ev = new Evidence({ ...base, publicationDate: new Date() });
      expect(ev.isRecent(5)).toBe(true);
    });

    it('returns false for old evidence', () => {
      const ev = new Evidence({ ...base, publicationDate: '2000-01-01' });
      expect(ev.isRecent(5)).toBe(false);
    });
  });
});

describe('EvidenceSource enum', () => {
  it('has 9 source types', () => {
    expect(Object.values(EvidenceSource)).toHaveLength(9);
  });
  it('includes META_ANALYSIS', () => expect(EvidenceSource.META_ANALYSIS).toBe('META_ANALYSIS'));
  it('includes COCHRANE', () => expect(EvidenceSource.COCHRANE).toBe('COCHRANE'));
});

describe('EvidenceRating', () => {
  const base = {
    id: 'r1',
    evidenceId: 'ev1',
    grade: GradeQuality.HIGH,
    quality: 90,
    strength: RecommendationStrength.STRONG,
    riskOfBias: RiskOfBias.LOW,
    consistency: 'CONSISTENT' as const,
    directness: 'DIRECT' as const,
    precision: 'PRECISE' as const,
  };

  it('sets all fields', () => {
    const r = new EvidenceRating(base);
    expect(r.id).toBe('r1');
    expect(r.evidenceId).toBe('ev1');
    expect(r.grade).toBe(GradeQuality.HIGH);
    expect(r.quality).toBe(90);
    expect(r.strength).toBe(RecommendationStrength.STRONG);
  });

  it('clamps quality to [0, 100]', () => {
    expect(new EvidenceRating({ ...base, quality: 150 }).quality).toBe(100);
    expect(new EvidenceRating({ ...base, quality: -10 }).quality).toBe(0);
  });

  it('defaults riskOfBias to MODERATE', () => {
    const r = new EvidenceRating({ id: 'r2', evidenceId: 'ev1', grade: GradeQuality.HIGH, quality: 80, strength: RecommendationStrength.STRONG });
    expect(r.riskOfBias).toBe(RiskOfBias.MODERATE);
  });

  it('defaults consistency to CONSISTENT', () => {
    const r = new EvidenceRating({ id: 'r2', evidenceId: 'ev1', grade: GradeQuality.HIGH, quality: 80, strength: RecommendationStrength.STRONG });
    expect(r.consistency).toBe('CONSISTENT');
  });

  it('defaults directness to DIRECT', () => {
    const r = new EvidenceRating({ id: 'r2', evidenceId: 'ev1', grade: GradeQuality.HIGH, quality: 80, strength: RecommendationStrength.STRONG });
    expect(r.directness).toBe('DIRECT');
  });

  it('defaults precision to PRECISE', () => {
    const r = new EvidenceRating({ id: 'r2', evidenceId: 'ev1', grade: GradeQuality.HIGH, quality: 80, strength: RecommendationStrength.STRONG });
    expect(r.precision).toBe('PRECISE');
  });

  describe('overallScore', () => {
    it('returns value between 0 and 1', () => {
      const score = new EvidenceRating(base).overallScore();
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('HIGH grade yields higher score than MODERATE', () => {
      const high = new EvidenceRating({ ...base, grade: GradeQuality.HIGH });
      const moderate = new EvidenceRating({ ...base, grade: GradeQuality.MODERATE });
      expect(high.overallScore()).toBeGreaterThan(moderate.overallScore());
    });

    it('LOW bias yields higher score than HIGH bias', () => {
      const lowBias = new EvidenceRating({ ...base, riskOfBias: RiskOfBias.LOW });
      const highBias = new EvidenceRating({ ...base, riskOfBias: RiskOfBias.HIGH });
      expect(lowBias.overallScore()).toBeGreaterThan(highBias.overallScore());
    });

    it('CONSISTENT yields higher score than INCONSISTENT', () => {
      const consistent = new EvidenceRating({ ...base, consistency: 'CONSISTENT' });
      const inconsistent = new EvidenceRating({ ...base, consistency: 'INCONSISTENT' });
      expect(consistent.overallScore()).toBeGreaterThan(inconsistent.overallScore());
    });

    it('zero quality yields zero score', () => {
      expect(new EvidenceRating({ ...base, quality: 0 }).overallScore()).toBe(0);
    });
  });

  describe('isHighQuality', () => {
    it('returns true for HIGH grade', () => {
      expect(new EvidenceRating({ ...base, grade: GradeQuality.HIGH }).isHighQuality()).toBe(true);
    });
    it('returns true for MODERATE grade', () => {
      expect(new EvidenceRating({ ...base, grade: GradeQuality.MODERATE }).isHighQuality()).toBe(true);
    });
    it('returns false for LOW grade', () => {
      expect(new EvidenceRating({ ...base, grade: GradeQuality.LOW }).isHighQuality()).toBe(false);
    });
    it('returns false for VERY_LOW grade', () => {
      expect(new EvidenceRating({ ...base, grade: GradeQuality.VERY_LOW }).isHighQuality()).toBe(false);
    });
  });

  describe('isStrongRecommendation', () => {
    it('returns true for STRONG', () => {
      expect(new EvidenceRating({ ...base, strength: RecommendationStrength.STRONG }).isStrongRecommendation()).toBe(true);
    });
    it('returns false for CONDITIONAL', () => {
      expect(new EvidenceRating({ ...base, strength: RecommendationStrength.CONDITIONAL }).isStrongRecommendation()).toBe(false);
    });
    it('returns false for WEAK', () => {
      expect(new EvidenceRating({ ...base, strength: RecommendationStrength.WEAK }).isStrongRecommendation()).toBe(false);
    });
  });
});

describe('ClinicalCitation', () => {
  const base = {
    id: 'c1',
    evidenceId: 'ev1',
    clinicalRuleId: 'rule-card-001',
    guidelineId: 'gl-sbc-2020',
    context: 'Suporta recomendação de DASH.',
    confidence: 0.95,
  };

  it('sets all fields', () => {
    const c = new ClinicalCitation(base);
    expect(c.id).toBe('c1');
    expect(c.evidenceId).toBe('ev1');
    expect(c.clinicalRuleId).toBe('rule-card-001');
    expect(c.guidelineId).toBe('gl-sbc-2020');
    expect(c.context).toBe('Suporta recomendação de DASH.');
    expect(c.confidence).toBe(0.95);
  });

  it('defaults confidence to 1', () => {
    const c = new ClinicalCitation({ id: 'c2', evidenceId: 'ev1', context: 'test' });
    expect(c.confidence).toBe(1);
  });

  it('clamps confidence to [0, 1]', () => {
    expect(new ClinicalCitation({ ...base, confidence: 1.5 }).confidence).toBe(1);
    expect(new ClinicalCitation({ ...base, confidence: -0.1 }).confidence).toBe(0);
  });

  it('clinicalRuleId is optional', () => {
    const c = new ClinicalCitation({ id: 'c3', evidenceId: 'ev1', context: 'test' });
    expect(c.clinicalRuleId).toBeUndefined();
  });

  it('guidelineId is optional', () => {
    const c = new ClinicalCitation({ id: 'c4', evidenceId: 'ev1', context: 'test' });
    expect(c.guidelineId).toBeUndefined();
  });

  it('isHighConfidence returns true when >= 0.8', () => {
    expect(new ClinicalCitation({ ...base, confidence: 0.8 }).isHighConfidence()).toBe(true);
    expect(new ClinicalCitation({ ...base, confidence: 0.95 }).isHighConfidence()).toBe(true);
  });

  it('isHighConfidence returns false when < 0.8', () => {
    expect(new ClinicalCitation({ ...base, confidence: 0.79 }).isHighConfidence()).toBe(false);
  });
});
