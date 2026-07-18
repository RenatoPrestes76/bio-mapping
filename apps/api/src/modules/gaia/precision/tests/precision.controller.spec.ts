import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PrecisionController } from '../controllers/precision.controller.js';
import type { PrecisionService } from '../services/precision.service.js';

const mockService: jest.Mocked<PrecisionService> = {
  createOrUpdateProfile: jest.fn(),
  findProfile: jest.fn(),
  calculateRisk: jest.fn(),
  getRecommendations: jest.fn(),
  createCarePlan: jest.fn(),
  getTimeline: jest.fn(),
} as any;

const user = { sub: 'u1' };

describe('PrecisionController', () => {
  let controller: PrecisionController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PrecisionController(mockService);
  });

  it('createOrUpdateProfile delegates to service with userId', async () => {
    const dto = { patientId: 'p1', tenantId: 't1' } as any;
    (mockService.createOrUpdateProfile as any).mockResolvedValue({ id: 'pr1' });
    const result = await controller.createOrUpdateProfile(dto, user);
    expect(mockService.createOrUpdateProfile).toHaveBeenCalledWith(dto, 'u1');
    expect((result as any).id).toBe('pr1');
  });

  it('findProfile delegates to service with patientId', async () => {
    (mockService.findProfile as any).mockResolvedValue({ id: 'pr1', patientId: 'p1' });
    const result = await controller.findProfile('p1');
    expect(mockService.findProfile).toHaveBeenCalledWith('p1');
    expect((result as any).patientId).toBe('p1');
  });

  it('calculateRisk passes patientId, userId, baseRiskScore, trendSlope', async () => {
    (mockService.calculateRisk as any).mockResolvedValue({ id: 'ri1' });
    const result = await controller.calculateRisk({ patientId: 'p1', baseRiskScore: 0.4, trendSlope: 0.1 }, user);
    expect(mockService.calculateRisk).toHaveBeenCalledWith('p1', 'u1', 0.4, 0.1);
    expect((result as any).id).toBe('ri1');
  });

  it('calculateRisk passes undefined for optional params', async () => {
    (mockService.calculateRisk as any).mockResolvedValue({ id: 'ri1' });
    await controller.calculateRisk({ patientId: 'p1' }, user);
    expect(mockService.calculateRisk).toHaveBeenCalledWith('p1', 'u1', undefined, undefined);
  });

  it('getRecommendations passes patientId and userId', async () => {
    (mockService.getRecommendations as any).mockResolvedValue([{ id: 'rec1' }]);
    const result = await controller.getRecommendations('p1', user);
    expect(mockService.getRecommendations).toHaveBeenCalledWith('p1', 'u1');
    expect((result as any)[0].id).toBe('rec1');
  });

  it('createCarePlan delegates to service with userId', async () => {
    const dto = { patientId: 'p1', title: 'Plano' } as any;
    (mockService.createCarePlan as any).mockResolvedValue({ id: 'cp1' });
    const result = await controller.createCarePlan(dto, user);
    expect(mockService.createCarePlan).toHaveBeenCalledWith(dto, 'u1');
    expect((result as any).id).toBe('cp1');
  });

  it('getTimeline passes patientId and metric filter', async () => {
    (mockService.getTimeline as any).mockResolvedValue({ summaries: [], metrics: [] });
    await controller.getTimeline('p1', 'glucose');
    expect(mockService.getTimeline).toHaveBeenCalledWith('p1', 'glucose');
  });

  it('getTimeline passes undefined metric when not provided', async () => {
    (mockService.getTimeline as any).mockResolvedValue({ summaries: [], metrics: [] });
    await controller.getTimeline('p1', undefined);
    expect(mockService.getTimeline).toHaveBeenCalledWith('p1', undefined);
  });
});
