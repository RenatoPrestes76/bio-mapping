import { EvidenceEngineController } from '../evidence-engine.controller.js';
import { EvidenceEngineService } from '../evidence-engine.service.js';
import { Evidence, EvidenceSource, EvidenceLanguage } from '../entities/evidence.entity.js';
import { EvidenceRating, GradeQuality, RecommendationStrength, RiskOfBias } from '../entities/evidence-rating.entity.js';
import { ClinicalCitation } from '../entities/clinical-citation.entity.js';
import { GradingResult, OxfordLevel, USPSTFGrade, AHRQLevel } from '../grading/grade-system.js';

function mkEvidence(id: string): Evidence {
  return new Evidence({
    id,
    title: id,
    abstract: 'abstract',
    authors: ['Author'],
    journal: 'Journal',
    publicationDate: '2022-01-01',
    source: EvidenceSource.META_ANALYSIS,
    keywords: [id],
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

const mockGrading: GradingResult = {
  oxfordLevel: OxfordLevel.LEVEL_1A,
  uspstfGrade: USPSTFGrade.A,
  ahrqLevel: AHRQLevel.I,
  gradeQuality: GradeQuality.HIGH,
  numericScore: 0.9,
};

describe('EvidenceEngineController', () => {
  let controller: EvidenceEngineController;
  let service: jest.Mocked<EvidenceEngineService>;

  const evA = mkEvidence('ev1');
  const evB = mkEvidence('ev2');
  const rating = mkRating('ev1');
  const citation = new ClinicalCitation({ id: 'c1', evidenceId: 'ev1', clinicalRuleId: 'rule-001', context: 'test' });

  beforeEach(() => {
    service = {
      getEvidence: jest.fn(),
      search: jest.fn(),
      rank: jest.fn(),
      getSupportingStudies: jest.fn(),
      findByTopic: jest.fn(),
      findByGuideline: jest.fn(),
      getClinicalSupport: jest.fn(),
      getEvidenceSummary: jest.fn(),
    } as unknown as jest.Mocked<EvidenceEngineService>;

    controller = new EvidenceEngineController(service);
  });

  describe('GET /evidence/search', () => {
    it('returns { evidence } array', () => {
      service.search.mockReturnValue([evA]);
      expect(controller.search('statin', undefined, undefined)).toEqual({ evidence: [evA] });
    });

    it('delegates q, source, language to service', () => {
      service.search.mockReturnValue([]);
      controller.search('statin', EvidenceSource.COCHRANE, EvidenceLanguage.EN);
      expect(service.search).toHaveBeenCalledWith('statin', EvidenceSource.COCHRANE, EvidenceLanguage.EN);
    });

    it('uses empty string default for q', () => {
      service.search.mockReturnValue([]);
      controller.search('', undefined, undefined);
      expect(service.search).toHaveBeenCalledWith('', undefined, undefined);
    });

    it('returns empty array when no results', () => {
      service.search.mockReturnValue([]);
      expect(controller.search('xyz', undefined, undefined)).toEqual({ evidence: [] });
    });
  });

  describe('GET /evidence/topic', () => {
    it('returns { evidence } for topic', () => {
      service.findByTopic.mockReturnValue([evA, evB]);
      const result = controller.getByTopic('cardiovascular');
      expect(result).toEqual({ evidence: [evA, evB] });
    });

    it('delegates topic to service.findByTopic', () => {
      service.findByTopic.mockReturnValue([]);
      controller.getByTopic('hypertension');
      expect(service.findByTopic).toHaveBeenCalledWith('hypertension');
    });

    it('returns empty array for unknown topic', () => {
      service.findByTopic.mockReturnValue([]);
      expect(controller.getByTopic('unknown')).toEqual({ evidence: [] });
    });
  });

  describe('GET /evidence/condition', () => {
    it('returns { evidence } for condition', () => {
      service.getSupportingStudies.mockReturnValue([evA]);
      const result = controller.getByCondition('diabetes');
      expect(result).toEqual({ evidence: [evA] });
    });

    it('delegates to service.getSupportingStudies', () => {
      service.getSupportingStudies.mockReturnValue([]);
      controller.getByCondition('hypertension');
      expect(service.getSupportingStudies).toHaveBeenCalledWith('hypertension');
    });

    it('defaults to empty string condition', () => {
      service.getSupportingStudies.mockReturnValue([]);
      controller.getByCondition('');
      expect(service.getSupportingStudies).toHaveBeenCalledWith('');
    });
  });

  describe('GET /evidence/guidelines', () => {
    it('returns { evidence } for guideline', () => {
      service.findByGuideline.mockReturnValue([evA]);
      const result = controller.getByGuideline('gl-sbc-2020');
      expect(result).toEqual({ evidence: [evA] });
    });

    it('delegates to service.findByGuideline', () => {
      service.findByGuideline.mockReturnValue([]);
      controller.getByGuideline('gl-ada-2024');
      expect(service.findByGuideline).toHaveBeenCalledWith('gl-ada-2024');
    });

    it('returns empty for unknown guideline', () => {
      service.findByGuideline.mockReturnValue([]);
      expect(controller.getByGuideline('gl-unknown')).toEqual({ evidence: [] });
    });
  });

  describe('GET /evidence/summary', () => {
    it('returns evidence summary from service', () => {
      const summary = { evidence: evA, rating, grading: mockGrading, citations: [citation], relatedCount: 3 };
      service.getEvidenceSummary.mockReturnValue(summary);
      expect(controller.getSummary('ev1')).toBe(summary);
    });

    it('delegates id to service.getEvidenceSummary', () => {
      service.getEvidenceSummary.mockReturnValue({ evidence: evA, rating: null, grading: null, citations: [], relatedCount: 0 });
      controller.getSummary('ev1');
      expect(service.getEvidenceSummary).toHaveBeenCalledWith('ev1');
    });
  });

  describe('GET /evidence/:id', () => {
    it('returns evidence by id', () => {
      service.getEvidence.mockReturnValue(evA);
      expect(controller.findOne('ev1')).toBe(evA);
    });

    it('delegates id to service.getEvidence', () => {
      service.getEvidence.mockReturnValue(evA);
      controller.findOne('ev-statin-meta-2022');
      expect(service.getEvidence).toHaveBeenCalledWith('ev-statin-meta-2022');
    });
  });
});
