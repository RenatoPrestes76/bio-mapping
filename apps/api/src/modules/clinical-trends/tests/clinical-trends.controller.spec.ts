import { TrendDirection, TrendStatus, TrendType } from '@bio/database';
import { ClinicalTrendsController } from '../controllers/clinical-trends.controller.js';

const user = { sub: 'user-1' };

const trend = {
  id: 'trend-1', patientId: 'p-1', metric: 'blood_pressure',
  trendType: TrendType.WORSENING, direction: TrendDirection.INCREASING,
  status: TrendStatus.ACTIVE, startDate: new Date(), confidence: 0.87,
  sourceModule: 'cds', summary: 'PA em piora', createdAt: new Date(), updatedAt: new Date(),
};

const makeService = (overrides: Record<string, unknown> = {}) => ({
  analyze: jest.fn().mockResolvedValue([trend]),
  findByPatient: jest.fn().mockResolvedValue([trend]),
  findById: jest.fn().mockResolvedValue(trend),
  findActive: jest.fn().mockResolvedValue([trend]),
  recalculate: jest.fn().mockResolvedValue(trend),
  archive: jest.fn().mockResolvedValue({ ...trend, status: TrendStatus.ARCHIVED }),
  ...overrides,
});

describe('ClinicalTrendsController', () => {
  describe('analyze', () => {
    it('delegates to service with dto and userId', async () => {
      const service = makeService();
      const controller = new ClinicalTrendsController(service as never);
      const dto = { patientId: 'p-1', metrics: ['blood_pressure'] };
      const result = await controller.analyze(dto, user);
      expect(service.analyze).toHaveBeenCalledWith(dto, 'user-1');
      expect(result).toEqual([trend]);
    });

    it('passes all metrics when no metrics filter given', async () => {
      const service = makeService();
      const controller = new ClinicalTrendsController(service as never);
      await controller.analyze({ patientId: 'p-1' }, user);
      expect(service.analyze).toHaveBeenCalledWith({ patientId: 'p-1' }, 'user-1');
    });
  });

  describe('findAll', () => {
    it('calls findByPatient when patientId query param is given', async () => {
      const service = makeService();
      const controller = new ClinicalTrendsController(service as never);
      const result = await controller.findAll('p-1', 'blood_pressure', TrendStatus.ACTIVE);
      expect(service.findByPatient).toHaveBeenCalledWith(
        'p-1',
        expect.objectContaining({ metric: 'blood_pressure', status: TrendStatus.ACTIVE }),
      );
      expect(result).toEqual([trend]);
    });

    it('calls findActive when no patientId is given', async () => {
      const service = makeService();
      const controller = new ClinicalTrendsController(service as never);
      await controller.findAll();
      expect(service.findActive).toHaveBeenCalled();
    });
  });

  describe('findByPatient', () => {
    it('delegates to service with patientId and filters', async () => {
      const service = makeService();
      const controller = new ClinicalTrendsController(service as never);
      const result = await controller.findByPatient('p-1', 'blood_pressure', TrendStatus.ACTIVE);
      expect(service.findByPatient).toHaveBeenCalledWith(
        'p-1',
        expect.objectContaining({ metric: 'blood_pressure', status: TrendStatus.ACTIVE }),
      );
      expect(result).toEqual([trend]);
    });
  });

  describe('findOne', () => {
    it('delegates to service findById', async () => {
      const service = makeService();
      const controller = new ClinicalTrendsController(service as never);
      const result = await controller.findOne('trend-1');
      expect(service.findById).toHaveBeenCalledWith('trend-1');
      expect(result).toBe(trend);
    });
  });

  describe('archive', () => {
    it('delegates to service archive with id and userId', async () => {
      const service = makeService();
      const controller = new ClinicalTrendsController(service as never);
      const result = await controller.archive('trend-1', user);
      expect(service.archive).toHaveBeenCalledWith('trend-1', 'user-1');
      expect(result.status).toBe(TrendStatus.ARCHIVED);
    });
  });
});
