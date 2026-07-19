import { NotFoundException } from '@nestjs/common';
import { EvidenceEngineService } from '../evidence-engine.service.js';
import { EvidenceProvider } from '../providers/evidence.provider.js';
import { Evidence, EvidenceSource, EvidenceLanguage } from '../entities/evidence.entity.js';
import { EvidenceRating, GradeQuality, RecommendationStrength, RiskOfBias } from '../entities/evidence-rating.entity.js';
import { ClinicalCitation } from '../entities/clinical-citation.entity.js';

function mkEvidence(id: string): Evidence {
  return new Evidence({
    id,
    title: id,
    abstract: 'test abstract',
    authors: ['Author'],
    journal: 'Journal',
    publicationDate: '2022-01-01',
    source: EvidenceSource.META_ANALYSIS,
    keywords: [id, 'cardiovascular'],
  });
}

function mkRating(evidenceId: string): EvidenceRating {
  return new EvidenceRating({
    id: `r-${evidenceId}`,
    evidenceId,
    grade: GradeQuality.HIGH,
    quality: 90,
    strength: RecommendationStrength.STRONG,
    riskOfBias: RiskOfBias.LOW,
  });
}

function mkCitation(id: string, evidenceId: string, ruleId?: string): ClinicalCitation {
  return new ClinicalCitation({ id, evidenceId, clinicalRuleId: ruleId, context: 'test' });
}

describe('EvidenceEngineService', () => {
  let service: EvidenceEngineService;
  let provider: jest.Mocked<EvidenceProvider>;

  const evA = mkEvidence('ev1');
  const evB = mkEvidence('ev2');
  const rating = mkRating('ev1');
  const citation = mkCitation('c1', 'ev1', 'rule-001');

  beforeEach(() => {
    provider = {
      getById: jest.fn(),
      searchEvidence: jest.fn(),
      findByTopic: jest.fn(),
      findByCondition: jest.fn(),
      findByGuideline: jest.fn(),
      findRelatedEvidence: jest.fn(),
      rankEvidence: jest.fn(),
      getRating: jest.fn(),
      getCitationsForEvidence: jest.fn(),
      getCitationsForRule: jest.fn(),
      getCitationsForGuideline: jest.fn(),
      count: jest.fn(),
      citationCount: jest.fn(),
      clearCache: jest.fn(),
      loadEvidence: jest.fn(),
      loadCitations: jest.fn(),
    } as unknown as jest.Mocked<EvidenceProvider>;

    service = new EvidenceEngineService(provider);
  });

  describe('getEvidence', () => {
    it('returns evidence when found', () => {
      provider.getById.mockReturnValue(evA);
      expect(service.getEvidence('ev1')).toBe(evA);
    });

    it('throws NotFoundException when not found', () => {
      provider.getById.mockReturnValue(undefined);
      expect(() => service.getEvidence('unknown')).toThrow(NotFoundException);
    });

    it('includes id in error message', () => {
      provider.getById.mockReturnValue(undefined);
      expect(() => service.getEvidence('xyz')).toThrow("Evidence 'xyz' not found");
    });
  });

  describe('search', () => {
    it('delegates to provider.searchEvidence', () => {
      provider.searchEvidence.mockReturnValue([evA]);
      const result = service.search('statin');
      expect(provider.searchEvidence).toHaveBeenCalledWith('statin', undefined, undefined);
      expect(result).toEqual([evA]);
    });

    it('passes source and language filters', () => {
      provider.searchEvidence.mockReturnValue([]);
      service.search('statin', EvidenceSource.COCHRANE, EvidenceLanguage.EN);
      expect(provider.searchEvidence).toHaveBeenCalledWith('statin', EvidenceSource.COCHRANE, EvidenceLanguage.EN);
    });

    it('returns empty array when no results', () => {
      provider.searchEvidence.mockReturnValue([]);
      expect(service.search('xyz')).toEqual([]);
    });
  });

  describe('rank', () => {
    it('ranks all evidence when no query', () => {
      provider.rankEvidence.mockReturnValue([]);
      service.rank();
      expect(provider.searchEvidence).not.toHaveBeenCalled();
      expect(provider.rankEvidence).toHaveBeenCalledWith();
    });

    it('filters then ranks when query provided', () => {
      provider.searchEvidence.mockReturnValue([evA]);
      provider.rankEvidence.mockReturnValue([]);
      service.rank('statin');
      expect(provider.searchEvidence).toHaveBeenCalledWith('statin');
      expect(provider.rankEvidence).toHaveBeenCalledWith([evA]);
    });

    it('treats whitespace query as no query', () => {
      provider.rankEvidence.mockReturnValue([]);
      service.rank('   ');
      expect(provider.rankEvidence).toHaveBeenCalledWith();
    });
  });

  describe('getSupportingStudies', () => {
    it('delegates to provider.findByCondition', () => {
      provider.findByCondition.mockReturnValue([evA]);
      expect(service.getSupportingStudies('diabetes')).toEqual([evA]);
      expect(provider.findByCondition).toHaveBeenCalledWith('diabetes');
    });
  });

  describe('findByTopic', () => {
    it('delegates to provider.findByTopic', () => {
      provider.findByTopic.mockReturnValue([evA]);
      expect(service.findByTopic('cardiovascular')).toEqual([evA]);
      expect(provider.findByTopic).toHaveBeenCalledWith('cardiovascular');
    });
  });

  describe('findByGuideline', () => {
    it('delegates to provider.findByGuideline', () => {
      provider.findByGuideline.mockReturnValue([evA]);
      expect(service.findByGuideline('gl-sbc-2020')).toEqual([evA]);
      expect(provider.findByGuideline).toHaveBeenCalledWith('gl-sbc-2020');
    });
  });

  describe('getClinicalSupport', () => {
    it('returns citations and evidence for a rule', () => {
      provider.getCitationsForRule.mockReturnValue([citation]);
      provider.getById.mockReturnValue(evA);
      const result = service.getClinicalSupport('rule-001');
      expect(result.citations).toHaveLength(1);
      expect(result.evidence).toHaveLength(1);
      expect(result.evidence[0]).toBe(evA);
    });

    it('deduplicates evidence IDs', () => {
      const c2 = mkCitation('c2', 'ev1', 'rule-001');
      provider.getCitationsForRule.mockReturnValue([citation, c2]);
      provider.getById.mockReturnValue(evA);
      const result = service.getClinicalSupport('rule-001');
      expect(result.evidence).toHaveLength(1);
    });

    it('returns empty evidence when evidence not found', () => {
      provider.getCitationsForRule.mockReturnValue([citation]);
      provider.getById.mockReturnValue(undefined);
      const result = service.getClinicalSupport('rule-001');
      expect(result.evidence).toHaveLength(0);
    });

    it('returns empty arrays when no citations', () => {
      provider.getCitationsForRule.mockReturnValue([]);
      const result = service.getClinicalSupport('rule-unknown');
      expect(result.citations).toHaveLength(0);
      expect(result.evidence).toHaveLength(0);
    });
  });

  describe('getEvidenceSummary', () => {
    it('throws NotFoundException when evidence not found', () => {
      provider.getById.mockReturnValue(undefined);
      expect(() => service.getEvidenceSummary('unknown')).toThrow(NotFoundException);
    });

    it('returns complete summary with rating and grading', () => {
      provider.getById.mockReturnValue(evA);
      provider.getRating.mockReturnValue(rating);
      provider.getCitationsForEvidence.mockReturnValue([citation]);
      provider.findRelatedEvidence.mockReturnValue([evB]);
      const summary = service.getEvidenceSummary('ev1');
      expect(summary.evidence).toBe(evA);
      expect(summary.rating).toBe(rating);
      expect(summary.grading).not.toBeNull();
      expect(summary.citations).toHaveLength(1);
      expect(summary.relatedCount).toBe(1);
    });

    it('returns null rating and grading when no rating exists', () => {
      provider.getById.mockReturnValue(evA);
      provider.getRating.mockReturnValue(undefined);
      provider.getCitationsForEvidence.mockReturnValue([]);
      provider.findRelatedEvidence.mockReturnValue([]);
      const summary = service.getEvidenceSummary('ev1');
      expect(summary.rating).toBeNull();
      expect(summary.grading).toBeNull();
    });
  });
});
