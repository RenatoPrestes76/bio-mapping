import { NotFoundException } from '@nestjs/common';
import { TrendDirection, TrendStatus, TrendType } from '@bio/database';
import { ClinicalTrendsService } from '../services/clinical-trends.service.js';

const trend = {
  id: 'trend-1', patientId: 'p-1', metric: 'blood_pressure',
  trendType: TrendType.INSUFFICIENT_DATA, direction: TrendDirection.STABLE,
  status: TrendStatus.ACTIVE, startDate: new Date(), confidence: 0,
  sourceModule: 'cds', summary: 'Dados insuficientes', createdAt: new Date(), updatedAt: new Date(),
};

const makeRepo = (overrides: Record<string, unknown> = {}) => ({
  create: jest.fn().mockResolvedValue(trend),
  findByPatient: jest.fn().mockResolvedValue([trend]),
  findActive: jest.fn().mockResolvedValue([trend]),
  findByMetric: jest.fn().mockResolvedValue(null),
  findById: jest.fn().mockResolvedValue(trend),
  archive: jest.fn().mockResolvedValue({ ...trend, status: TrendStatus.ARCHIVED }),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makePrisma = () => ({
  clinicalDecision: {
    findMany: jest.fn().mockResolvedValue([]),
  },
});

const makeAudit = () => ({ log: jest.fn().mockResolvedValue(undefined) });

describe('ClinicalTrendsService', () => {
  describe('analyze', () => {
    it('creates a trend for each of the 5 analyzers', async () => {
      const repo = makeRepo();
      const service = new ClinicalTrendsService(repo as never, makePrisma() as never, makeAudit() as never);
      const result = await service.analyze({ patientId: 'p-1' }, 'user-1');
      expect(repo.create).toHaveBeenCalledTimes(5);
      expect(result).toHaveLength(5);
    });

    it('logs TREND_ANALYZED audit event', async () => {
      const audit = makeAudit();
      const service = new ClinicalTrendsService(makeRepo() as never, makePrisma() as never, audit as never);
      await service.analyze({ patientId: 'p-1' }, 'user-1');
      expect(audit.log).toHaveBeenCalledWith('TREND_ANALYZED', expect.objectContaining({ userId: 'user-1' }));
    });

    it('only analyzes specified metrics when metrics array is provided', async () => {
      const repo = makeRepo();
      const service = new ClinicalTrendsService(repo as never, makePrisma() as never, makeAudit() as never);
      const result = await service.analyze({ patientId: 'p-1', metrics: ['blood_pressure'] }, 'user-1');
      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });

    it('reads decision triggerData to build blood_pressure data points', async () => {
      const prisma = makePrisma();
      const decision = {
        triggerData: { bp_systolic: 165, bp_diastolic: 100 },
        createdAt: new Date(),
      };
      (prisma.clinicalDecision.findMany as jest.Mock).mockResolvedValue([decision]);
      const repo = makeRepo();
      const service = new ClinicalTrendsService(repo as never, prisma as never, makeAudit() as never);
      await service.analyze({ patientId: 'p-1', metrics: ['blood_pressure'] });
      expect(prisma.clinicalDecision.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { patientId: 'p-1', ruleId: 'HYPERTENSION_UNCONTROLLED' } }),
      );
    });

    it('returns INSUFFICIENT_DATA trends when no decisions exist', async () => {
      const repo = makeRepo({
        create: jest.fn().mockImplementation((data) => Promise.resolve({ ...trend, ...data })),
      });
      const prisma = makePrisma();
      const service = new ClinicalTrendsService(repo as never, prisma as never, makeAudit() as never);
      await service.analyze({ patientId: 'p-1', metrics: ['glycemic'] });
      const created = (repo.create as jest.Mock).mock.calls[0][0];
      expect(created.trendType).toBe(TrendType.INSUFFICIENT_DATA);
    });
  });

  describe('recalculate', () => {
    it('archives existing trend then creates a new one', async () => {
      const existingTrend = { ...trend };
      const repo = makeRepo({ findByMetric: jest.fn().mockResolvedValue(existingTrend) });
      const service = new ClinicalTrendsService(repo as never, makePrisma() as never, makeAudit() as never);
      await service.recalculate('p-1', 'blood_pressure', 'user-1');
      expect(repo.archive).toHaveBeenCalledWith('trend-1', 'user-1');
      expect(repo.create).toHaveBeenCalledTimes(1);
    });

    it('logs TREND_RECALCULATED audit event', async () => {
      const audit = makeAudit();
      const service = new ClinicalTrendsService(makeRepo() as never, makePrisma() as never, audit as never);
      await service.recalculate('p-1', 'blood_pressure', 'user-1');
      expect(audit.log).toHaveBeenCalledWith('TREND_RECALCULATED', expect.objectContaining({ userId: 'user-1' }));
    });

    it('throws NotFoundException for unknown metric', async () => {
      const service = new ClinicalTrendsService(makeRepo() as never, makePrisma() as never, makeAudit() as never);
      await expect(service.recalculate('p-1', 'unknown_metric')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findByPatient', () => {
    it('delegates to repo with patientId and filters', async () => {
      const repo = makeRepo();
      const service = new ClinicalTrendsService(repo as never, makePrisma() as never, makeAudit() as never);
      const result = await service.findByPatient('p-1', { metric: 'blood_pressure' });
      expect(repo.findByPatient).toHaveBeenCalledWith('p-1', { metric: 'blood_pressure' });
      expect(result).toEqual([trend]);
    });
  });

  describe('findById', () => {
    it('returns a trend by id', async () => {
      const service = new ClinicalTrendsService(makeRepo() as never, makePrisma() as never, makeAudit() as never);
      const result = await service.findById('trend-1');
      expect(result).toBe(trend);
    });

    it('throws NotFoundException when trend not found', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const service = new ClinicalTrendsService(repo as never, makePrisma() as never, makeAudit() as never);
      await expect(service.findById('nonexistent')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findActive', () => {
    it('delegates to repo findActive', async () => {
      const repo = makeRepo();
      const service = new ClinicalTrendsService(repo as never, makePrisma() as never, makeAudit() as never);
      const result = await service.findActive('p-1');
      expect(repo.findActive).toHaveBeenCalledWith('p-1');
      expect(result).toEqual([trend]);
    });
  });

  describe('archive', () => {
    it('archives a trend and logs audit', async () => {
      const audit = makeAudit();
      const service = new ClinicalTrendsService(makeRepo() as never, makePrisma() as never, audit as never);
      const result = await service.archive('trend-1', 'user-1');
      expect(result.status).toBe(TrendStatus.ARCHIVED);
      expect(audit.log).toHaveBeenCalledWith('TREND_ARCHIVED', expect.objectContaining({ userId: 'user-1' }));
    });
  });
});
