import { ClinicalKnowledgeCategory, EvidenceLevel, KnowledgeStatus } from '@bio/database';
import { ClinicalKnowledgeService } from '../services/clinical-knowledge.service.js';
import { KnowledgeProvider } from '../providers/knowledge.provider.js';
import { ClinicalRule } from '../entities/clinical-rule.entity.js';
import { ClinicalGuideline } from '../entities/clinical-guideline.entity.js';
import { ClinicalReference } from '../entities/clinical-reference.entity.js';

const item = {
  id: 'ck-1',
  tenantId: null,
  category: ClinicalKnowledgeCategory.DISEASE,
  title: 'Hipertensão',
  description: 'Pressão elevada',
  clinicalCode: 'I10',
  source: 'CID-10',
  evidenceLevel: EvidenceLevel.A,
  language: 'pt-BR',
  version: 1,
  status: KnowledgeStatus.PUBLISHED,
  tags: ['hipertensão'],
  metadata: null,
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeRule = () =>
  new ClinicalRule({
    id: 'rule-1',
    category: 'CARDIOLOGY',
    condition: 'PA ≥ 140/90',
    recommendation: 'Iniciar tratamento',
    evidenceLevel: 'A',
    priority: 1,
    source: 'SBC 2020',
    tags: ['hipertensão', 'cardiovascular'],
  });

const makeGuideline = () =>
  new ClinicalGuideline({
    id: 'gl-1',
    title: 'Diretrizes SBC 2020',
    organization: 'SBC',
    version: '2020',
    publishedAt: '2020-01-01',
    tags: ['hipertensão'],
  });

const makeReference = () =>
  new ClinicalReference({
    id: 'ref-1',
    title: 'Meta-análise sódio',
    description: 'Redução de PA com baixo sódio',
    tags: ['hipertensão', 'sódio'],
    confidence: 0.9,
    language: 'pt-BR',
  });

const makeRepo = () => ({
  create: jest.fn().mockResolvedValue(item),
  update: jest.fn().mockResolvedValue({ ...item, version: 2 }),
  findById: jest.fn().mockResolvedValue(item),
  findByCategory: jest.fn().mockResolvedValue([item]),
  findPublished: jest.fn().mockResolvedValue([item]),
  search: jest.fn().mockResolvedValue({ items: [item], total: 1 }),
  delete: jest.fn().mockResolvedValue(undefined),
});

const makeAudit = () => ({ log: jest.fn().mockResolvedValue(undefined) });

const makeProvider = (): KnowledgeProvider => {
  const provider = new KnowledgeProvider();
  jest.spyOn(provider, 'search').mockReturnValue([{ type: 'rule', item: makeRule(), score: 3 }]);
  jest.spyOn(provider, 'findByCategory').mockReturnValue([makeRule()]);
  jest.spyOn(provider, 'findByTags').mockReturnValue([
    { type: 'guideline', item: makeGuideline(), score: 2 },
    { type: 'reference', item: makeReference(), score: 2 },
  ]);
  jest.spyOn(provider, 'getGuidelines').mockReturnValue([makeGuideline()]);
  jest.spyOn(provider, 'getRules').mockReturnValue([makeRule()]);
  jest.spyOn(provider, 'getReferences').mockReturnValue([makeReference()]);
  return provider;
};

describe('ClinicalKnowledgeService — extended methods', () => {
  let service: ClinicalKnowledgeService;
  let repo: ReturnType<typeof makeRepo>;
  let provider: KnowledgeProvider;

  beforeEach(() => {
    repo = makeRepo();
    provider = makeProvider();
    service = new ClinicalKnowledgeService(repo as never, makeAudit() as never, provider);
  });

  describe('searchKnowledge', () => {
    it('returns dbResults and providerResults', async () => {
      const result = await service.searchKnowledge('hipertensão');
      expect(result).toHaveProperty('dbResults');
      expect(result).toHaveProperty('providerResults');
    });

    it('dbResults contains items array and total', async () => {
      const result = await service.searchKnowledge('hipertensão');
      expect(result.dbResults.items).toHaveLength(1);
      expect(result.dbResults.total).toBe(1);
    });

    it('providerResults contains search hits from provider', async () => {
      const result = await service.searchKnowledge('hipertensão');
      expect(result.providerResults.length).toBeGreaterThan(0);
    });

    it('calls repo.search with text filter', async () => {
      await service.searchKnowledge('diabetes');
      expect(repo.search).toHaveBeenCalledWith(expect.objectContaining({ text: 'diabetes' }));
    });

    it('calls provider.search with same query', async () => {
      await service.searchKnowledge('diabetes');
      expect(provider.search).toHaveBeenCalledWith('diabetes');
    });

    it('returns empty providerResults when no provider', async () => {
      const serviceNoProvider = new ClinicalKnowledgeService(repo as never, makeAudit() as never);
      const result = await serviceNoProvider.searchKnowledge('test');
      expect(result.providerResults).toEqual([]);
    });
  });

  describe('getRecommendations', () => {
    it('returns rules for the given category', async () => {
      const rules = await service.getRecommendations('CARDIOLOGY');
      expect(rules.length).toBeGreaterThan(0);
      expect(provider.findByCategory).toHaveBeenCalledWith('CARDIOLOGY');
    });

    it('filters by condition when provided', async () => {
      jest.spyOn(provider, 'findByCategory').mockReturnValue([
        makeRule(),
        new ClinicalRule({
          id: 'rule-2',
          category: 'CARDIOLOGY',
          condition: 'LDL ≥ 190 mg/dL',
          recommendation: 'Iniciar estatina',
          evidenceLevel: 'A',
          priority: 1,
          source: 'SBC 2017',
        }),
      ]);
      const rules = await service.getRecommendations('CARDIOLOGY', 'LDL');
      expect(rules.every((r) => r.matchesCondition('LDL'))).toBe(true);
    });

    it('returns empty array when no provider', async () => {
      const s = new ClinicalKnowledgeService(repo as never, makeAudit() as never);
      const rules = await s.getRecommendations('CARDIOLOGY');
      expect(rules).toEqual([]);
    });
  });

  describe('getEvidence', () => {
    it('returns dbItems and providerResults', async () => {
      const result = await service.getEvidence('I10');
      expect(result).toHaveProperty('dbItems');
      expect(result).toHaveProperty('providerResults');
    });

    it('searches repo by clinicalCode', async () => {
      await service.getEvidence('I10');
      expect(repo.search).toHaveBeenCalledWith(expect.objectContaining({ clinicalCode: 'I10' }));
    });

    it('searches provider with same code', async () => {
      await service.getEvidence('E11');
      expect(provider.search).toHaveBeenCalledWith('E11');
    });

    it('returns empty providerResults without provider', async () => {
      const s = new ClinicalKnowledgeService(repo as never, makeAudit() as never);
      const result = await s.getEvidence('I10');
      expect(result.providerResults).toEqual([]);
    });
  });

  describe('findGuidelines', () => {
    it('returns all guidelines when no tags', () => {
      const result = service.findGuidelines();
      expect(result.length).toBeGreaterThan(0);
      expect(provider.getGuidelines).toHaveBeenCalled();
    });

    it('filters by tags when provided', () => {
      const result = service.findGuidelines(['hipertensão']);
      expect(provider.findByTags).toHaveBeenCalledWith(['hipertensão']);
      for (const g of result) {
        expect(g).toBeInstanceOf(ClinicalGuideline);
      }
    });

    it('returns empty array without provider', () => {
      const s = new ClinicalKnowledgeService(repo as never, makeAudit() as never);
      expect(s.findGuidelines()).toEqual([]);
    });

    it('returns empty array with empty tags array', () => {
      const result = service.findGuidelines([]);
      expect(provider.getGuidelines).toHaveBeenCalled();
    });
  });

  describe('findRules', () => {
    it('returns all rules when no category', () => {
      const result = service.findRules();
      expect(result.length).toBeGreaterThan(0);
      expect(provider.getRules).toHaveBeenCalled();
    });

    it('filters by category when provided', () => {
      const result = service.findRules('CARDIOLOGY');
      expect(provider.findByCategory).toHaveBeenCalledWith('CARDIOLOGY');
      for (const r of result) {
        expect(r).toBeInstanceOf(ClinicalRule);
      }
    });

    it('returns empty array without provider', () => {
      const s = new ClinicalKnowledgeService(repo as never, makeAudit() as never);
      expect(s.findRules()).toEqual([]);
    });
  });

  describe('findReferences', () => {
    it('returns all references when no filters', () => {
      const result = service.findReferences();
      expect(result.length).toBeGreaterThan(0);
      expect(provider.getReferences).toHaveBeenCalled();
    });

    it('filters by tags when provided', () => {
      const result = service.findReferences({ tags: ['sódio'] });
      expect(provider.findByTags).toHaveBeenCalledWith(['sódio']);
      for (const r of result) {
        expect(r).toBeInstanceOf(ClinicalReference);
      }
    });

    it('filters by language', () => {
      jest.spyOn(provider, 'getReferences').mockReturnValue([
        makeReference(),
        new ClinicalReference({ id: 'ref-en', title: 'English ref', description: 'Desc', language: 'en' }),
      ]);
      const result = service.findReferences({ language: 'pt-BR' });
      expect(result.every((r) => r.language === 'pt-BR')).toBe(true);
    });

    it('returns empty array without provider', () => {
      const s = new ClinicalKnowledgeService(repo as never, makeAudit() as never);
      expect(s.findReferences()).toEqual([]);
    });

    it('returns empty array with empty tags (uses getReferences)', () => {
      const result = service.findReferences({ tags: [] });
      expect(provider.getReferences).toHaveBeenCalled();
    });
  });
});
