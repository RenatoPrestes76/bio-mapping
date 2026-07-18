import { NotFoundException } from '@nestjs/common';
import { ClinicalKnowledgeCategory, EvidenceLevel, KnowledgeStatus } from '@bio/database';
import { ClinicalKnowledgeService } from '../services/clinical-knowledge.service.js';

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

const makeRepo = (overrides: Record<string, unknown> = {}) => ({
  create: jest.fn().mockResolvedValue(item),
  update: jest.fn().mockResolvedValue({ ...item, version: 2 }),
  findById: jest.fn().mockResolvedValue(item),
  findByCategory: jest.fn().mockResolvedValue([item]),
  findPublished: jest.fn().mockResolvedValue([item]),
  search: jest.fn().mockResolvedValue({ items: [item], total: 1 }),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeAudit = () => ({ log: jest.fn().mockResolvedValue(undefined) });

describe('ClinicalKnowledgeService', () => {
  describe('create', () => {
    it('creates a knowledge entry and logs audit', async () => {
      const repo = makeRepo();
      const audit = makeAudit();
      const service = new ClinicalKnowledgeService(repo as never, audit as never);
      const result = await service.create({
        category: ClinicalKnowledgeCategory.DISEASE,
        title: 'Hipertensão',
        evidenceLevel: EvidenceLevel.A,
      }, 'user-1');
      expect(result).toBe(item);
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ createdBy: 'user-1' }));
      expect(audit.log).toHaveBeenCalledWith('KNOWLEDGE_CREATED', expect.objectContaining({ userId: 'user-1' }));
    });
  });

  describe('update', () => {
    it('increments version and logs audit', async () => {
      const repo = makeRepo();
      const audit = makeAudit();
      const service = new ClinicalKnowledgeService(repo as never, audit as never);
      const result = await service.update('ck-1', { title: 'Hipertensão Arterial' }, 'user-2');
      expect(result.version).toBe(2);
      expect(audit.log).toHaveBeenCalledWith('KNOWLEDGE_UPDATED', expect.objectContaining({ userId: 'user-2' }));
    });

    it('throws NotFoundException when entry does not exist', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const service = new ClinicalKnowledgeService(repo as never, makeAudit() as never);
      await expect(service.update('missing', { title: 'X' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findById', () => {
    it('returns the entry', async () => {
      const service = new ClinicalKnowledgeService(makeRepo() as never, makeAudit() as never);
      const result = await service.findById('ck-1');
      expect(result).toBe(item);
    });

    it('throws NotFoundException when not found', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const service = new ClinicalKnowledgeService(repo as never, makeAudit() as never);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findByCategory', () => {
    it('delegates to repo', async () => {
      const repo = makeRepo();
      const service = new ClinicalKnowledgeService(repo as never, makeAudit() as never);
      const result = await service.findByCategory(ClinicalKnowledgeCategory.DISEASE, 'tenant-1');
      expect(repo.findByCategory).toHaveBeenCalledWith(ClinicalKnowledgeCategory.DISEASE, 'tenant-1');
      expect(result).toEqual([item]);
    });
  });

  describe('findPublished', () => {
    it('returns only published entries', async () => {
      const service = new ClinicalKnowledgeService(makeRepo() as never, makeAudit() as never);
      const result = await service.findPublished();
      expect(result).toEqual([item]);
    });
  });

  describe('search', () => {
    it('returns paginated results', async () => {
      const service = new ClinicalKnowledgeService(makeRepo() as never, makeAudit() as never);
      const result = await service.search({ text: 'hipertensão', page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('delete', () => {
    it('deletes entry and logs audit', async () => {
      const repo = makeRepo();
      const audit = makeAudit();
      const service = new ClinicalKnowledgeService(repo as never, audit as never);
      await service.delete('ck-1', 'user-1');
      expect(repo.delete).toHaveBeenCalledWith('ck-1');
      expect(audit.log).toHaveBeenCalledWith('KNOWLEDGE_DELETED', expect.objectContaining({ userId: 'user-1' }));
    });

    it('throws NotFoundException when entry does not exist', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const service = new ClinicalKnowledgeService(repo as never, makeAudit() as never);
      await expect(service.delete('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
