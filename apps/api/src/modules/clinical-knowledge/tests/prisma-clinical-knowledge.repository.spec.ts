import { ClinicalKnowledgeCategory, EvidenceLevel, KnowledgeStatus } from '@bio/database';
import { PrismaClinicalKnowledgeRepository } from '../repositories/prisma-clinical-knowledge.repository.js';

const item = {
  id: 'ck-1',
  category: ClinicalKnowledgeCategory.DISEASE,
  title: 'Hipertensão',
  evidenceLevel: EvidenceLevel.A,
  status: KnowledgeStatus.PUBLISHED,
  version: 1,
  tags: [],
  language: 'pt-BR',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makePrisma = () => ({
  clinicalKnowledge: {
    create: jest.fn().mockResolvedValue(item),
    update: jest.fn().mockResolvedValue({ ...item, version: 2 }),
    findUnique: jest.fn().mockResolvedValue(item),
    findUniqueOrThrow: jest.fn().mockResolvedValue(item),
    findMany: jest.fn().mockResolvedValue([item]),
    findFirst: jest.fn().mockResolvedValue(item),
    count: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue({}),
  },
});

describe('PrismaClinicalKnowledgeRepository', () => {
  describe('create', () => {
    it('creates and returns the new entry', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalKnowledgeRepository(prisma as never);
      const result = await repo.create({
        category: ClinicalKnowledgeCategory.DISEASE,
        title: 'Hipertensão',
        evidenceLevel: EvidenceLevel.A,
      });
      expect(result).toBe(item);
      expect(prisma.clinicalKnowledge.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ title: 'Hipertensão' }) }),
      );
    });

    it('defaults status to DRAFT when not provided', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalKnowledgeRepository(prisma as never);
      await repo.create({ category: ClinicalKnowledgeCategory.DISEASE, title: 'X', evidenceLevel: EvidenceLevel.B });
      expect(prisma.clinicalKnowledge.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: KnowledgeStatus.DRAFT }) }),
      );
    });

    it('defaults language to pt-BR when not provided', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalKnowledgeRepository(prisma as never);
      await repo.create({ category: ClinicalKnowledgeCategory.DISEASE, title: 'X', evidenceLevel: EvidenceLevel.C });
      expect(prisma.clinicalKnowledge.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ language: 'pt-BR' }) }),
      );
    });
  });

  describe('update', () => {
    it('increments version on update', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalKnowledgeRepository(prisma as never);
      const result = await repo.update('ck-1', { title: 'Hipertensão Atualizada' });
      expect(prisma.clinicalKnowledge.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ version: 2 }) }),
      );
      expect(result.version).toBe(2);
    });
  });

  describe('findById', () => {
    it('returns entry by id', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalKnowledgeRepository(prisma as never);
      const result = await repo.findById('ck-1');
      expect(result).toBe(item);
    });

    it('returns null when not found', async () => {
      const prisma = makePrisma();
      prisma.clinicalKnowledge.findUnique = jest.fn().mockResolvedValue(null);
      const repo = new PrismaClinicalKnowledgeRepository(prisma as never);
      const result = await repo.findById('missing');
      expect(result).toBeNull();
    });
  });

  describe('findByCategory', () => {
    it('filters by category', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalKnowledgeRepository(prisma as never);
      const result = await repo.findByCategory(ClinicalKnowledgeCategory.DISEASE);
      expect(prisma.clinicalKnowledge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ category: ClinicalKnowledgeCategory.DISEASE }) }),
      );
      expect(result).toEqual([item]);
    });

    it('adds tenantId filter when provided', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalKnowledgeRepository(prisma as never);
      await repo.findByCategory(ClinicalKnowledgeCategory.DISEASE, 'tenant-1');
      expect(prisma.clinicalKnowledge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-1' }) }),
      );
    });
  });

  describe('findPublished', () => {
    it('filters by PUBLISHED status', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalKnowledgeRepository(prisma as never);
      await repo.findPublished();
      expect(prisma.clinicalKnowledge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: KnowledgeStatus.PUBLISHED }) }),
      );
    });
  });

  describe('search', () => {
    it('returns items and total', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalKnowledgeRepository(prisma as never);
      const result = await repo.search({ text: 'hipertensão', page: 1, limit: 10 });
      expect(result.items).toEqual([item]);
      expect(result.total).toBe(1);
    });

    it('applies text filter with OR on title and description', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalKnowledgeRepository(prisma as never);
      await repo.search({ text: 'diabetes' });
      const call = (prisma.clinicalKnowledge.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.OR).toBeDefined();
      expect(call.where.OR).toHaveLength(2);
    });

    it('applies pagination via skip and take', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalKnowledgeRepository(prisma as never);
      await repo.search({ page: 3, limit: 10 });
      const call = (prisma.clinicalKnowledge.findMany as jest.Mock).mock.calls[0][0];
      expect(call.skip).toBe(20);
      expect(call.take).toBe(10);
    });
  });

  describe('delete', () => {
    it('deletes by id', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalKnowledgeRepository(prisma as never);
      await repo.delete('ck-1');
      expect(prisma.clinicalKnowledge.delete).toHaveBeenCalledWith({ where: { id: 'ck-1' } });
    });
  });
});
