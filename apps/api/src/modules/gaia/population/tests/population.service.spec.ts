import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { PopulationService } from '../services/population.service.js';

const makeCohort = () => ({
  id: 'cohort-1', tenantId: 't1', name: 'Diabéticos', description: null,
  segment: null, status: 'ACTIVE', patientCount: 25, filters: [],
  createdBy: 'u1', createdAt: new Date(), updatedAt: new Date(),
});

const makeMetric = (key: string, value: number) => ({
  id: `metric-${key}`, tenantId: 't1', cohortId: 'cohort-1',
  metricType: 'MEAN', metricKey: key, value, unit: null,
  periodStart: new Date(), periodEnd: new Date(), computedAt: new Date(), metadata: null,
});

let repo: any;
let prisma: any;
let audit: any;
let service: PopulationService;

beforeEach(() => {
  repo = {
    createCohort: jest.fn().mockResolvedValue(makeCohort()),
    findCohortById: jest.fn().mockResolvedValue(makeCohort()),
    findCohortsByTenant: jest.fn().mockResolvedValue([makeCohort()]),
    updateCohortCount: jest.fn().mockResolvedValue(makeCohort()),
    updateCohort: jest.fn().mockResolvedValue(makeCohort()),
    createCohortFilters: jest.fn().mockResolvedValue([]),
    findFiltersByCohortId: jest.fn().mockResolvedValue([]),
    upsertCohortMembers: jest.fn().mockResolvedValue(undefined),
    findMembersByCohortId: jest.fn().mockResolvedValue([]),
    createMetric: jest.fn().mockResolvedValue(makeMetric('bmi', 27)),
    findMetricsByTenant: jest.fn().mockResolvedValue([makeMetric('bmi', 27)]),
    findMetricsByCohort: jest.fn().mockResolvedValue([makeMetric('bmi', 27)]),
    createTrend: jest.fn().mockResolvedValue({}),
    findTrendsByTenant: jest.fn().mockResolvedValue([]),
    findTrendsByCohort: jest.fn().mockResolvedValue([]),
    createAlert: jest.fn().mockResolvedValue({}),
    findActiveAlerts: jest.fn().mockResolvedValue([]),
    acknowledgeAlert: jest.fn().mockResolvedValue({}),
    createBenchmarkResults: jest.fn().mockResolvedValue([]),
    findStatisticsByCohort: jest.fn().mockResolvedValue([]),
    createStatistic: jest.fn().mockResolvedValue({}),
  } as any;

  prisma = {
    patientProfile: {
      findMany: jest.fn().mockResolvedValue([
        { patientId: 'p1', age: 45, sex: 'MALE', bmi: 27, smoking: false, alcohol: 'MODERATE', lifestyle: 'SEDENTARY', conditions: ['diabetes'], familyHistory: [], medications: [] },
        { patientId: 'p2', age: 55, sex: 'FEMALE', bmi: 30, smoking: true, alcohol: 'NONE', lifestyle: 'SEDENTARY', conditions: [], familyHistory: ['hypertension'], medications: [] },
      ]),
    },
    personalizedRisk: {
      findMany: jest.fn().mockResolvedValue([
        { patientId: 'p1', riskLevel: 'HIGH', finalRiskScore: 0.70 },
        { patientId: 'p2', riskLevel: 'MODERATE', finalRiskScore: 0.45 },
      ]),
    },
  } as any;

  audit = { log: jest.fn().mockResolvedValue(undefined) } as any;

  service = new PopulationService(repo, prisma, audit);
});

describe('PopulationService', () => {
  describe('createCohort', () => {
    it('queries patient profiles for the tenant', async () => {
      await service.createCohort({ name: 'Test', tenantId: 't1', filters: [] }, 'u1');
      expect(prisma.patientProfile.findMany).toHaveBeenCalled();
    });

    it('creates cohort in repository', async () => {
      await service.createCohort({ name: 'Test', tenantId: 't1', filters: [] }, 'u1');
      expect(repo.createCohort).toHaveBeenCalled();
    });

    it('updates patient count', async () => {
      await service.createCohort({ name: 'Test', tenantId: 't1', filters: [] }, 'u1');
      expect(repo.updateCohortCount).toHaveBeenCalled();
    });

    it('creates filters when provided', async () => {
      await service.createCohort({
        name: 'Test', tenantId: 't1',
        filters: [{ filterKey: 'age', filterOperator: 'gte', filterValue: '40' }],
      }, 'u1');
      expect(repo.createCohortFilters).toHaveBeenCalled();
    });

    it('does not create filters when none provided', async () => {
      await service.createCohort({ name: 'Test', tenantId: 't1', filters: [] }, 'u1');
      expect(repo.createCohortFilters).not.toHaveBeenCalled();
    });

    it('logs COHORT_CREATED audit', async () => {
      await service.createCohort({ name: 'Test', tenantId: 't1', filters: [] }, 'u1');
      expect(audit.log).toHaveBeenCalledWith('COHORT_CREATED', expect.any(Object));
    });

    it('returns created cohort', async () => {
      const cohort = await service.createCohort({ name: 'Test', tenantId: 't1', filters: [] }, 'u1');
      expect(cohort.id).toBe('cohort-1');
    });
  });

  describe('getCohort', () => {
    it('throws NotFoundException when cohort not found', async () => {
      repo.findCohortById.mockResolvedValue(null);
      await expect(service.getCohort('unknown')).rejects.toThrow(NotFoundException);
    });

    it('returns cohort, filters, and metrics', async () => {
      const result = await service.getCohort('cohort-1');
      expect(result).toHaveProperty('cohort');
      expect(result).toHaveProperty('filters');
      expect(result).toHaveProperty('metrics');
    });
  });

  describe('compareCohortsById', () => {
    it('throws NotFoundException when cohort A not found', async () => {
      repo.findCohortById.mockResolvedValueOnce(null);
      await expect(service.compareCohortsById({ cohortAId: 'x', cohortBId: 'y' }, 'u1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when cohort B not found', async () => {
      repo.findCohortById.mockResolvedValueOnce(makeCohort()).mockResolvedValueOnce(null);
      await expect(service.compareCohortsById({ cohortAId: 'x', cohortBId: 'y' }, 'u1')).rejects.toThrow(NotFoundException);
    });

    it('creates benchmark results', async () => {
      await service.compareCohortsById({ cohortAId: 'cohort-1', cohortBId: 'cohort-2' }, 'u1');
      expect(repo.createBenchmarkResults).toHaveBeenCalled();
    });

    it('logs COHORT_COMPARED audit', async () => {
      await service.compareCohortsById({ cohortAId: 'cohort-1', cohortBId: 'cohort-2' }, 'u1');
      expect(audit.log).toHaveBeenCalledWith('COHORT_COMPARED', expect.any(Object));
    });

    it('returns cohortA, cohortB, and report', async () => {
      const result = await service.compareCohortsById({ cohortAId: 'cohort-1', cohortBId: 'cohort-2' }, 'u1');
      expect(result).toHaveProperty('cohortA');
      expect(result).toHaveProperty('cohortB');
      expect(result).toHaveProperty('report');
    });
  });

  describe('getPopulationDashboard', () => {
    it('returns totalPatients', async () => {
      const result = await service.getPopulationDashboard({ tenantId: 't1' });
      expect(result).toHaveProperty('totalPatients');
      expect(result.totalPatients).toBe(2);
    });

    it('returns riskDistribution', async () => {
      const result = await service.getPopulationDashboard({ tenantId: 't1' });
      expect(result).toHaveProperty('riskDistribution');
    });

    it('logs POPULATION_DASHBOARD_ACCESSED', async () => {
      await service.getPopulationDashboard({ tenantId: 't1' });
      expect(audit.log).toHaveBeenCalledWith('POPULATION_DASHBOARD_ACCESSED', expect.any(Object));
    });
  });

  describe('getPopulationTrends', () => {
    it('returns stored and computed trends', async () => {
      const result = await service.getPopulationTrends({ tenantId: 't1' });
      expect(result).toHaveProperty('stored');
      expect(result).toHaveProperty('computed');
    });

    it('uses cohort trends when cohortId provided', async () => {
      await service.getPopulationTrends({ tenantId: 't1', cohortId: 'cohort-1' });
      expect(repo.findTrendsByCohort).toHaveBeenCalledWith('cohort-1');
    });
  });

  describe('getPopulationRisk', () => {
    it('returns distribution and trend', async () => {
      const result = await service.getPopulationRisk({ tenantId: 't1' });
      expect(result).toHaveProperty('distribution');
      expect(result).toHaveProperty('trend');
    });

    it('logs POPULATION_RISK_ANALYZED', async () => {
      await service.getPopulationRisk({ tenantId: 't1' });
      expect(audit.log).toHaveBeenCalledWith('POPULATION_RISK_ANALYZED', expect.any(Object));
    });
  });

  describe('getPopulationAlerts', () => {
    it('delegates to repository findActiveAlerts', async () => {
      await service.getPopulationAlerts('t1');
      expect(repo.findActiveAlerts).toHaveBeenCalledWith('t1');
    });
  });

  describe('acknowledgeAlert', () => {
    it('logs POPULATION_ALERT_ACKNOWLEDGED', async () => {
      await service.acknowledgeAlert('alert-1', 'u1');
      expect(audit.log).toHaveBeenCalledWith('POPULATION_ALERT_ACKNOWLEDGED', expect.any(Object));
    });

    it('calls repo acknowledgeAlert', async () => {
      await service.acknowledgeAlert('alert-1', 'u1');
      expect(repo.acknowledgeAlert).toHaveBeenCalledWith('alert-1', 'u1');
    });
  });
});
