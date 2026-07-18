import { ClinicalKnowledgeCategory, EvidenceLevel, KnowledgeStatus } from '@bio/database';
import { ClinicalKnowledgeController } from '../controllers/clinical-knowledge.controller.js';

const item = {
  id: 'ck-1',
  category: ClinicalKnowledgeCategory.DISEASE,
  title: 'Hipertensão',
  evidenceLevel: EvidenceLevel.A,
  status: KnowledgeStatus.PUBLISHED,
  version: 1,
};

const user = { sub: 'user-1' };

const makeService = (overrides: Record<string, unknown> = {}) => ({
  create: jest.fn().mockResolvedValue(item),
  update: jest.fn().mockResolvedValue({ ...item, version: 2 }),
  findById: jest.fn().mockResolvedValue(item),
  search: jest.fn().mockResolvedValue({ items: [item], total: 1 }),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('ClinicalKnowledgeController', () => {
  describe('create', () => {
    it('delegates to service with userId', async () => {
      const service = makeService();
      const controller = new ClinicalKnowledgeController(service as never);
      const body = { category: ClinicalKnowledgeCategory.DISEASE, title: 'Hipertensão', evidenceLevel: EvidenceLevel.A };
      const result = await controller.create(user, body);
      expect(service.create).toHaveBeenCalledWith(body, 'user-1');
      expect(result).toBe(item);
    });
  });

  describe('search', () => {
    it('parses pagination params and delegates to service', async () => {
      const service = makeService();
      const controller = new ClinicalKnowledgeController(service as never);
      const result = await controller.search(
        ClinicalKnowledgeCategory.DISEASE, KnowledgeStatus.PUBLISHED, undefined, undefined, undefined, undefined, undefined, '2', '10',
      );
      expect(service.search).toHaveBeenCalledWith(
        expect.objectContaining({ category: ClinicalKnowledgeCategory.DISEASE, status: KnowledgeStatus.PUBLISHED, page: 2, limit: 10 }),
      );
      expect(result.items).toHaveLength(1);
    });

    it('defaults to page 1 limit 20 when not provided', async () => {
      const service = makeService();
      const controller = new ClinicalKnowledgeController(service as never);
      await controller.search();
      expect(service.search).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 20 }));
    });
  });

  describe('findOne', () => {
    it('returns entry by id', async () => {
      const service = makeService();
      const controller = new ClinicalKnowledgeController(service as never);
      const result = await controller.findOne('ck-1');
      expect(service.findById).toHaveBeenCalledWith('ck-1');
      expect(result).toBe(item);
    });
  });

  describe('update', () => {
    it('delegates update with userId', async () => {
      const service = makeService();
      const controller = new ClinicalKnowledgeController(service as never);
      const result = await controller.update('ck-1', user, { title: 'Updated' });
      expect(service.update).toHaveBeenCalledWith('ck-1', { title: 'Updated' }, 'user-1');
      expect(result.version).toBe(2);
    });
  });

  describe('remove', () => {
    it('delegates delete with userId', async () => {
      const service = makeService();
      const controller = new ClinicalKnowledgeController(service as never);
      await controller.remove('ck-1', user);
      expect(service.delete).toHaveBeenCalledWith('ck-1', 'user-1');
    });
  });
});
