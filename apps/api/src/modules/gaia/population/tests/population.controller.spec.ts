import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CohortController } from '../controllers/cohort.controller.js';
import { PopulationController } from '../controllers/population.controller.js';

const user = { sub: 'u1' };

let service: any;

beforeEach(() => {
  service = {
    createCohort: jest.fn().mockResolvedValue({ id: 'cohort-1', name: 'Test' }),
    getCohort: jest.fn().mockResolvedValue({ cohort: {}, filters: [], metrics: [] }),
    compareCohortsById: jest.fn().mockResolvedValue({ cohortA: {}, cohortB: {}, report: {} }),
    getPopulationDashboard: jest.fn().mockResolvedValue({ totalPatients: 100 }),
    getPopulationTrends: jest.fn().mockResolvedValue({ stored: [], computed: [] }),
    getPopulationRisk: jest.fn().mockResolvedValue({ distribution: {}, trend: {} }),
    getPopulationAlerts: jest.fn().mockResolvedValue([]),
    acknowledgeAlert: jest.fn().mockResolvedValue({}),
  } as any;
});

describe('CohortController', () => {
  let controller: CohortController;
  beforeEach(() => { controller = new CohortController(service); });

  it('POST /cohorts delegates to service.createCohort with userId', async () => {
    const dto = { name: 'Test', tenantId: 't1', filters: [] };
    await controller.createCohort(dto as any, user);
    expect(service.createCohort).toHaveBeenCalledWith(dto, 'u1');
  });

  it('GET /cohorts/:id delegates to service.getCohort', async () => {
    await controller.getCohort('cohort-1');
    expect(service.getCohort).toHaveBeenCalledWith('cohort-1');
  });

  it('GET /cohorts/:id returns cohort, filters, metrics', async () => {
    const out = await controller.getCohort('cohort-1');
    expect(out).toHaveProperty('cohort');
    expect(out).toHaveProperty('filters');
  });

  it('POST /cohorts/compare delegates to service.compareCohortsById', async () => {
    const dto = { cohortAId: 'a', cohortBId: 'b' };
    await controller.compareCohortsById(dto as any, user);
    expect(service.compareCohortsById).toHaveBeenCalledWith(dto, 'u1');
  });

  it('POST /cohorts/compare returns report', async () => {
    const out = await controller.compareCohortsById({ cohortAId: 'a', cohortBId: 'b' } as any, user);
    expect(out).toHaveProperty('report');
  });
});

describe('PopulationController', () => {
  let controller: PopulationController;
  beforeEach(() => { controller = new PopulationController(service); });

  it('GET /population/dashboard calls service with tenantId', async () => {
    await controller.getDashboard('t1');
    expect(service.getPopulationDashboard).toHaveBeenCalledWith({ tenantId: 't1', cohortId: undefined });
  });

  it('GET /population/dashboard with cohortId passes it through', async () => {
    await controller.getDashboard('t1', 'cohort-1');
    expect(service.getPopulationDashboard).toHaveBeenCalledWith({ tenantId: 't1', cohortId: 'cohort-1' });
  });

  it('GET /population/trends calls service', async () => {
    await controller.getTrends('t1');
    expect(service.getPopulationTrends).toHaveBeenCalled();
  });

  it('GET /population/risk calls service', async () => {
    await controller.getRisk('t1');
    expect(service.getPopulationRisk).toHaveBeenCalled();
  });

  it('GET /population/alerts returns array', async () => {
    const out = await controller.getAlerts('t1');
    expect(Array.isArray(out)).toBe(true);
  });

  it('PATCH /population/alerts/:id/acknowledge calls service', async () => {
    await controller.acknowledgeAlert('alert-1', user);
    expect(service.acknowledgeAlert).toHaveBeenCalledWith('alert-1', 'u1');
  });
});
