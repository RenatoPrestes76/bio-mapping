import { ClinicalKnowledgeCategory, EvidenceLevel, KnowledgeStatus } from '@bio/database';
import { ClinicalKnowledgeController } from '../controllers/clinical-knowledge.controller.js';
import { ClinicalRule } from '../entities/clinical-rule.entity.js';
import { ClinicalGuideline } from '../entities/clinical-guideline.entity.js';
import { ClinicalReference } from '../entities/clinical-reference.entity.js';
import { CLINICAL_DOMAINS } from '../knowledge/categories.js';

const makeRule = () =>
  new ClinicalRule({
    id: 'rule-1',
    category: 'CARDIOLOGY',
    condition: 'PA ≥ 140/90',
    recommendation: 'Tratamento',
    evidenceLevel: 'A',
    priority: 1,
    source: 'SBC',
  });

const makeGuideline = () =>
  new ClinicalGuideline({ id: 'gl-1', title: 'Diretrizes SBC', organization: 'SBC', version: '2020', publishedAt: '2020-01-01' });

const makeReference = () =>
  new ClinicalReference({ id: 'ref-1', title: 'Meta-análise', description: 'Dados', tags: ['hipertensão'], language: 'pt-BR' });

const makeService = () => ({
  create: jest.fn(),
  update: jest.fn(),
  findById: jest.fn().mockResolvedValue({ id: 'ck-1', title: 'Hipertensão', category: ClinicalKnowledgeCategory.DISEASE, evidenceLevel: EvidenceLevel.A, status: KnowledgeStatus.PUBLISHED, version: 1 }),
  search: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  delete: jest.fn(),
  searchKnowledge: jest.fn().mockResolvedValue({ dbResults: { items: [], total: 0 }, providerResults: [] }),
  getRecommendations: jest.fn().mockResolvedValue([makeRule()]),
  getEvidence: jest.fn().mockResolvedValue({ dbItems: [], providerResults: [] }),
  findGuidelines: jest.fn().mockReturnValue([makeGuideline()]),
  findRules: jest.fn().mockReturnValue([makeRule()]),
  findReferences: jest.fn().mockReturnValue([makeReference()]),
});

describe('ClinicalKnowledgeController — extended endpoints', () => {
  let controller: ClinicalKnowledgeController;
  let service: ReturnType<typeof makeService>;

  beforeEach(() => {
    service = makeService();
    controller = new ClinicalKnowledgeController(service as never);
  });

  describe('GET /clinical-knowledge/search', () => {
    it('delegates to service.searchKnowledge with query', async () => {
      const result = await controller.searchKnowledge('diabetes');
      expect(service.searchKnowledge).toHaveBeenCalledWith('diabetes');
      expect(result).toHaveProperty('dbResults');
    });

    it('defaults to empty string when no query', async () => {
      await controller.searchKnowledge();
      expect(service.searchKnowledge).toHaveBeenCalledWith('');
    });
  });

  describe('GET /clinical-knowledge/categories', () => {
    it('returns categories array', () => {
      const result = controller.getCategories();
      expect(result).toHaveProperty('categories');
      expect(Array.isArray(result.categories)).toBe(true);
    });

    it('returns all 14 clinical domains', () => {
      const result = controller.getCategories();
      expect(result.categories).toHaveLength(14);
    });

    it('each category has domain, label, and description', () => {
      const result = controller.getCategories();
      for (const cat of result.categories) {
        expect(cat).toHaveProperty('domain');
        expect(cat).toHaveProperty('label');
        expect(cat).toHaveProperty('description');
      }
    });

    it('includes CARDIOLOGY domain', () => {
      const result = controller.getCategories();
      const found = result.categories.find((c) => c.domain === 'CARDIOLOGY');
      expect(found).toBeDefined();
    });

    it('matches CLINICAL_DOMAINS constant', () => {
      const result = controller.getCategories();
      expect(result.categories).toBe(CLINICAL_DOMAINS);
    });
  });

  describe('GET /clinical-knowledge/rules', () => {
    it('returns rules wrapper', () => {
      const result = controller.getRules();
      expect(result).toHaveProperty('rules');
      expect(Array.isArray(result.rules)).toBe(true);
    });

    it('delegates to service.findRules without category', () => {
      controller.getRules();
      expect(service.findRules).toHaveBeenCalledWith(undefined);
    });

    it('delegates to service.findRules with category', () => {
      controller.getRules('CARDIOLOGY');
      expect(service.findRules).toHaveBeenCalledWith('CARDIOLOGY');
    });

    it('result contains rule items', () => {
      const result = controller.getRules();
      expect(result.rules.length).toBeGreaterThan(0);
    });
  });

  describe('GET /clinical-knowledge/guidelines', () => {
    it('returns guidelines wrapper', () => {
      const result = controller.getGuidelines();
      expect(result).toHaveProperty('guidelines');
      expect(Array.isArray(result.guidelines)).toBe(true);
    });

    it('delegates to service.findGuidelines without tags', () => {
      controller.getGuidelines();
      expect(service.findGuidelines).toHaveBeenCalledWith(undefined);
    });

    it('parses comma-separated tags and delegates', () => {
      controller.getGuidelines('hipertensão,cardiovascular');
      expect(service.findGuidelines).toHaveBeenCalledWith(['hipertensão', 'cardiovascular']);
    });

    it('filters empty strings from tags', () => {
      controller.getGuidelines('hipertensão,,cardiovascular');
      expect(service.findGuidelines).toHaveBeenCalledWith(['hipertensão', 'cardiovascular']);
    });
  });

  describe('GET /clinical-knowledge/references', () => {
    it('returns references wrapper', () => {
      const result = controller.getReferences();
      expect(result).toHaveProperty('references');
      expect(Array.isArray(result.references)).toBe(true);
    });

    it('delegates to service.findReferences without filters', () => {
      controller.getReferences();
      expect(service.findReferences).toHaveBeenCalledWith({ tags: undefined, language: undefined });
    });

    it('parses tags and language', () => {
      controller.getReferences('sódio,pressão', 'pt-BR');
      expect(service.findReferences).toHaveBeenCalledWith({ tags: ['sódio', 'pressão'], language: 'pt-BR' });
    });

    it('passes only language when no tags', () => {
      controller.getReferences(undefined, 'en');
      expect(service.findReferences).toHaveBeenCalledWith({ tags: undefined, language: 'en' });
    });
  });
});
