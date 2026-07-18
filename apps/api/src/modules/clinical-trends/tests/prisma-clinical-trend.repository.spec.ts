import { TrendDirection, TrendStatus, TrendType } from '@bio/database';
import { NotFoundException } from '@nestjs/common';
import { PrismaClinicalTrendRepository } from '../repositories/prisma-clinical-trend.repository.js';

const trend = {
  id: 'trend-1', patientId: 'p-1', metric: 'blood_pressure',
  trendType: TrendType.WORSENING, direction: TrendDirection.INCREASING,
  status: TrendStatus.ACTIVE, startDate: new Date(), confidence: 0.87,
  sourceModule: 'clinical-decision-support', summary: 'PA em piora',
  createdAt: new Date(), updatedAt: new Date(),
};

const makePrisma = (overrides: Record<string, unknown> = {}) => ({
  clinicalTrend: {
    create: jest.fn().mockResolvedValue(trend),
    findMany: jest.fn().mockResolvedValue([trend]),
    findFirst: jest.fn().mockResolvedValue(trend),
    findUnique: jest.fn().mockResolvedValue(trend),
    update: jest.fn().mockResolvedValue({ ...trend, status: TrendStatus.ARCHIVED }),
    delete: jest.fn().mockResolvedValue(trend),
    ...overrides,
  },
});

describe('PrismaClinicalTrendRepository', () => {
  describe('create', () => {
    it('creates a clinical trend', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalTrendRepository(prisma as never);
      const result = await repo.create({
        patientId: 'p-1', metric: 'blood_pressure',
        trendType: TrendType.WORSENING, direction: TrendDirection.INCREASING,
        startDate: new Date(), confidence: 0.87,
        sourceModule: 'clinical-decision-support', summary: 'PA em piora',
      });
      expect(result).toBe(trend);
      expect(prisma.clinicalTrend.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ patientId: 'p-1', metric: 'blood_pressure' }) }),
      );
    });

    it('defaults status to ACTIVE', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalTrendRepository(prisma as never);
      await repo.create({
        patientId: 'p-1', metric: 'bmi',
        trendType: TrendType.STABLE, direction: TrendDirection.STABLE,
        startDate: new Date(), confidence: 0.9,
        sourceModule: 'cds', summary: 'IMC estável',
      });
      const call = (prisma.clinicalTrend.create as jest.Mock).mock.calls[0][0];
      expect(call.data.status).toBe(TrendStatus.ACTIVE);
    });
  });

  describe('findByPatient', () => {
    it('queries by patientId ordered by createdAt desc', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalTrendRepository(prisma as never);
      const result = await repo.findByPatient('p-1');
      expect(prisma.clinicalTrend.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { patientId: 'p-1' }, orderBy: { createdAt: 'desc' } }),
      );
      expect(result).toEqual([trend]);
    });

    it('adds metric filter when provided', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalTrendRepository(prisma as never);
      await repo.findByPatient('p-1', { metric: 'blood_pressure' });
      expect(prisma.clinicalTrend.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ metric: 'blood_pressure' }) }),
      );
    });

    it('adds status filter when provided', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalTrendRepository(prisma as never);
      await repo.findByPatient('p-1', { status: TrendStatus.ACTIVE });
      expect(prisma.clinicalTrend.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: TrendStatus.ACTIVE }) }),
      );
    });

    it('applies pagination', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalTrendRepository(prisma as never);
      await repo.findByPatient('p-1', { limit: 10, offset: 20 });
      expect(prisma.clinicalTrend.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 20 }),
      );
    });
  });

  describe('findActive', () => {
    it('filters by ACTIVE status', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalTrendRepository(prisma as never);
      await repo.findActive();
      expect(prisma.clinicalTrend.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: TrendStatus.ACTIVE } }),
      );
    });

    it('adds patientId filter when provided', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalTrendRepository(prisma as never);
      await repo.findActive('p-1');
      expect(prisma.clinicalTrend.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: TrendStatus.ACTIVE, patientId: 'p-1' } }),
      );
    });
  });

  describe('findByMetric', () => {
    it('finds the latest active trend for a metric', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalTrendRepository(prisma as never);
      const result = await repo.findByMetric('p-1', 'blood_pressure');
      expect(result).toBe(trend);
    });

    it('returns null when not found', async () => {
      const prisma = makePrisma({ findFirst: jest.fn().mockResolvedValue(null) });
      const repo = new PrismaClinicalTrendRepository(prisma as never);
      const result = await repo.findByMetric('p-1', 'unknown');
      expect(result).toBeNull();
    });
  });

  describe('archive', () => {
    it('updates trend status to ARCHIVED', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalTrendRepository(prisma as never);
      const result = await repo.archive('trend-1', 'user-1');
      expect(prisma.clinicalTrend.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'trend-1' }, data: expect.objectContaining({ status: TrendStatus.ARCHIVED }) }),
      );
      expect(result.status).toBe(TrendStatus.ARCHIVED);
    });

    it('throws NotFoundException when trend not found', async () => {
      const prisma = makePrisma({ findUnique: jest.fn().mockResolvedValue(null) });
      const repo = new PrismaClinicalTrendRepository(prisma as never);
      await expect(repo.archive('nonexistent', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes a trend by id', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalTrendRepository(prisma as never);
      await repo.delete('trend-1');
      expect(prisma.clinicalTrend.delete).toHaveBeenCalledWith({ where: { id: 'trend-1' } });
    });
  });
});
