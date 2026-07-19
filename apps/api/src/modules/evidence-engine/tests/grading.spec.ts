import { EvidenceSource } from '../entities/evidence.entity.js';
import { GradeQuality, RecommendationStrength, RiskOfBias } from '../entities/evidence-rating.entity.js';
import {
  OxfordLevel,
  USPSTFGrade,
  AHRQLevel,
  getOxfordLevel,
  getAHRQLevel,
  getUSPSTFGrade,
  buildGradingResult,
} from '../grading/grade-system.js';
import { Evidence, EvidenceLanguage } from '../entities/evidence.entity.js';
import { EvidenceRating } from '../entities/evidence-rating.entity.js';
import { scoreEvidence, buildRatedEvidence, rankByScore, deduplicateEvidence } from '../grading/evidence-scorer.js';
import { ClinicalCitation } from '../entities/clinical-citation.entity.js';
import { CitationIndex } from '../citations/citation-index.js';

// Helpers
function mkEvidence(id: string, source: EvidenceSource, doi?: string, pmid?: string, recentYear = false): Evidence {
  return new Evidence({
    id,
    title: id,
    abstract: id,
    authors: ['Author'],
    journal: 'Journal',
    publicationDate: recentYear ? new Date() : '2000-01-01',
    source,
    doi,
    pmid,
    keywords: [id],
  });
}

function mkRating(evidenceId: string, grade = GradeQuality.HIGH, strength = RecommendationStrength.STRONG, quality = 90): EvidenceRating {
  return new EvidenceRating({ id: `rating-${evidenceId}`, evidenceId, grade, strength, quality, riskOfBias: RiskOfBias.LOW });
}

describe('Grade System — getOxfordLevel', () => {
  it('META_ANALYSIS → 1a', () => expect(getOxfordLevel(EvidenceSource.META_ANALYSIS)).toBe(OxfordLevel.LEVEL_1A));
  it('SYSTEMATIC_REVIEW → 1a', () => expect(getOxfordLevel(EvidenceSource.SYSTEMATIC_REVIEW)).toBe(OxfordLevel.LEVEL_1A));
  it('COCHRANE → 1a', () => expect(getOxfordLevel(EvidenceSource.COCHRANE)).toBe(OxfordLevel.LEVEL_1A));
  it('PUBMED → 1b', () => expect(getOxfordLevel(EvidenceSource.PUBMED)).toBe(OxfordLevel.LEVEL_1B));
  it('GUIDELINE → 4', () => expect(getOxfordLevel(EvidenceSource.GUIDELINE)).toBe(OxfordLevel.LEVEL_4));
  it('JOURNAL → 2b', () => expect(getOxfordLevel(EvidenceSource.JOURNAL)).toBe(OxfordLevel.LEVEL_2B));
});

describe('Grade System — getAHRQLevel', () => {
  it('META_ANALYSIS → I', () => expect(getAHRQLevel(EvidenceSource.META_ANALYSIS)).toBe(AHRQLevel.I));
  it('COCHRANE → I', () => expect(getAHRQLevel(EvidenceSource.COCHRANE)).toBe(AHRQLevel.I));
  it('PUBMED → II', () => expect(getAHRQLevel(EvidenceSource.PUBMED)).toBe(AHRQLevel.II));
  it('CLINICAL_TRIALS → II', () => expect(getAHRQLevel(EvidenceSource.CLINICAL_TRIALS)).toBe(AHRQLevel.II));
  it('GUIDELINE → VII', () => expect(getAHRQLevel(EvidenceSource.GUIDELINE)).toBe(AHRQLevel.VII));
  it('WHO → IV', () => expect(getAHRQLevel(EvidenceSource.WHO)).toBe(AHRQLevel.IV));
});

describe('Grade System — getUSPSTFGrade', () => {
  it('HIGH + STRONG → A', () => {
    expect(getUSPSTFGrade(GradeQuality.HIGH, RecommendationStrength.STRONG)).toBe(USPSTFGrade.A);
  });
  it('MODERATE + STRONG → B', () => {
    expect(getUSPSTFGrade(GradeQuality.MODERATE, RecommendationStrength.STRONG)).toBe(USPSTFGrade.B);
  });
  it('VERY_LOW → I (insufficient)', () => {
    expect(getUSPSTFGrade(GradeQuality.VERY_LOW, RecommendationStrength.CONDITIONAL)).toBe(USPSTFGrade.I);
  });
  it('WEAK strength → D', () => {
    expect(getUSPSTFGrade(GradeQuality.HIGH, RecommendationStrength.WEAK)).toBe(USPSTFGrade.D);
  });
  it('LOW + CONDITIONAL → C', () => {
    expect(getUSPSTFGrade(GradeQuality.LOW, RecommendationStrength.CONDITIONAL)).toBe(USPSTFGrade.C);
  });
});

describe('Grade System — buildGradingResult', () => {
  it('builds complete result', () => {
    const r = buildGradingResult(EvidenceSource.META_ANALYSIS, GradeQuality.HIGH, RecommendationStrength.STRONG, 0.9);
    expect(r.oxfordLevel).toBe(OxfordLevel.LEVEL_1A);
    expect(r.ahrqLevel).toBe(AHRQLevel.I);
    expect(r.uspstfGrade).toBe(USPSTFGrade.A);
    expect(r.gradeQuality).toBe(GradeQuality.HIGH);
    expect(r.numericScore).toBe(0.9);
  });
});

describe('Evidence Scorer — scoreEvidence', () => {
  it('returns value between 0 and 1', () => {
    const ev = mkEvidence('ev1', EvidenceSource.META_ANALYSIS);
    const rating = mkRating('ev1');
    const score = scoreEvidence(ev, rating);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('META_ANALYSIS has higher score than GUIDELINE', () => {
    const evMeta = mkEvidence('ev1', EvidenceSource.META_ANALYSIS);
    const evGuide = mkEvidence('ev2', EvidenceSource.GUIDELINE);
    const rating1 = mkRating('ev1');
    const rating2 = mkRating('ev2');
    expect(scoreEvidence(evMeta, rating1)).toBeGreaterThan(scoreEvidence(evGuide, rating2));
  });

  it('recency bonus adds to score', () => {
    const old = mkEvidence('ev1', EvidenceSource.COCHRANE, undefined, undefined, false);
    const recent = mkEvidence('ev2', EvidenceSource.COCHRANE, undefined, undefined, true);
    const rating = mkRating('ev1');
    const ratingRecent = mkRating('ev2');
    expect(scoreEvidence(recent, ratingRecent)).toBeGreaterThan(scoreEvidence(old, rating));
  });
});

describe('Evidence Scorer — buildRatedEvidence', () => {
  it('returns rated evidence with all fields', () => {
    const ev = mkEvidence('ev1', EvidenceSource.META_ANALYSIS);
    const rating = mkRating('ev1');
    const rated = buildRatedEvidence(ev, rating);
    expect(rated.evidence).toBe(ev);
    expect(rated.rating).toBe(rating);
    expect(rated.grading).toBeDefined();
    expect(typeof rated.totalScore).toBe('number');
  });

  it('grading uses correct source-to-oxford mapping', () => {
    const ev = mkEvidence('ev1', EvidenceSource.META_ANALYSIS);
    const rating = mkRating('ev1');
    const rated = buildRatedEvidence(ev, rating);
    expect(rated.grading.oxfordLevel).toBe(OxfordLevel.LEVEL_1A);
  });
});

describe('Evidence Scorer — rankByScore', () => {
  it('sorts descending by totalScore', () => {
    const ev1 = mkEvidence('ev1', EvidenceSource.META_ANALYSIS);
    const ev2 = mkEvidence('ev2', EvidenceSource.GUIDELINE);
    const r1 = mkRating('ev1', GradeQuality.HIGH, RecommendationStrength.STRONG, 95);
    const r2 = mkRating('ev2', GradeQuality.LOW, RecommendationStrength.WEAK, 40);
    const ranked = rankByScore([buildRatedEvidence(ev2, r2), buildRatedEvidence(ev1, r1)]);
    expect(ranked[0].evidence.id).toBe('ev1');
  });

  it('does not mutate input array', () => {
    const ev = mkEvidence('ev1', EvidenceSource.META_ANALYSIS);
    const r = mkRating('ev1');
    const original = [buildRatedEvidence(ev, r)];
    rankByScore(original);
    expect(original).toHaveLength(1);
  });
});

describe('Evidence Scorer — deduplicateEvidence', () => {
  it('removes duplicate DOI', () => {
    const ev1 = mkEvidence('ev1', EvidenceSource.META_ANALYSIS, '10.1234/abc');
    const ev2 = mkEvidence('ev2', EvidenceSource.META_ANALYSIS, '10.1234/abc');
    expect(deduplicateEvidence([ev1, ev2])).toHaveLength(1);
  });

  it('removes duplicate PMID when no DOI', () => {
    const ev1 = mkEvidence('ev1', EvidenceSource.META_ANALYSIS, undefined, '12345');
    const ev2 = mkEvidence('ev2', EvidenceSource.META_ANALYSIS, undefined, '12345');
    expect(deduplicateEvidence([ev1, ev2])).toHaveLength(1);
  });

  it('keeps items with different DOIs', () => {
    const ev1 = mkEvidence('ev1', EvidenceSource.META_ANALYSIS, '10.1234/abc');
    const ev2 = mkEvidence('ev2', EvidenceSource.META_ANALYSIS, '10.1234/def');
    expect(deduplicateEvidence([ev1, ev2])).toHaveLength(2);
  });

  it('falls back to id for deduplication when no DOI/PMID', () => {
    const ev1 = mkEvidence('ev1', EvidenceSource.META_ANALYSIS);
    const ev2 = mkEvidence('ev1', EvidenceSource.META_ANALYSIS); // same id
    expect(deduplicateEvidence([ev1, ev2])).toHaveLength(1);
  });
});

describe('CitationIndex', () => {
  let index: CitationIndex;

  const c1 = new ClinicalCitation({ id: 'c1', evidenceId: 'ev1', clinicalRuleId: 'rule-001', guidelineId: 'gl-001', context: 'test', confidence: 0.9 });
  const c2 = new ClinicalCitation({ id: 'c2', evidenceId: 'ev1', clinicalRuleId: 'rule-001', context: 'test2', confidence: 0.8 });
  const c3 = new ClinicalCitation({ id: 'c3', evidenceId: 'ev2', guidelineId: 'gl-001', context: 'test3', confidence: 0.7 });

  beforeEach(() => {
    index = new CitationIndex();
    index.addCitation(c1);
    index.addCitation(c2);
    index.addCitation(c3);
  });

  it('findByEvidenceId returns correct citations', () => {
    expect(index.findByEvidenceId('ev1')).toHaveLength(2);
    expect(index.findByEvidenceId('ev2')).toHaveLength(1);
  });

  it('findByEvidenceId returns empty for unknown', () => {
    expect(index.findByEvidenceId('unknown')).toHaveLength(0);
  });

  it('findByRuleId returns correct citations', () => {
    expect(index.findByRuleId('rule-001')).toHaveLength(2);
  });

  it('findByRuleId returns empty when no citations for rule', () => {
    expect(index.findByRuleId('rule-999')).toHaveLength(0);
  });

  it('findByGuidelineId returns correct citations', () => {
    expect(index.findByGuidelineId('gl-001')).toHaveLength(2);
  });

  it('findByGuidelineId returns empty for unknown guideline', () => {
    expect(index.findByGuidelineId('gl-999')).toHaveLength(0);
  });

  it('getAllCitations returns all', () => {
    expect(index.getAllCitations()).toHaveLength(3);
  });

  it('size returns total count', () => {
    expect(index.size()).toBe(3);
  });

  it('clear resets all maps', () => {
    index.clear();
    expect(index.size()).toBe(0);
    expect(index.getAllCitations()).toHaveLength(0);
    expect(index.findByEvidenceId('ev1')).toHaveLength(0);
    expect(index.findByRuleId('rule-001')).toHaveLength(0);
    expect(index.findByGuidelineId('gl-001')).toHaveLength(0);
  });

  it('citation without ruleId is not indexed by rule', () => {
    const c4 = new ClinicalCitation({ id: 'c4', evidenceId: 'ev3', context: 'no rule' });
    index.addCitation(c4);
    expect(index.findByEvidenceId('ev3')).toHaveLength(1);
  });
});
