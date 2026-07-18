import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { LearningController } from '../controllers/learning.controller.js';
import type { LearningService } from '../services/learning.service.js';

const mockService: jest.Mocked<LearningService> = {
  registerOutcome: jest.fn(),
  findOutcome: jest.fn(),
  getModelPerformance: jest.fn(),
  getStatistics: jest.fn(),
  getDriftEvents: jest.fn(),
  registerFeedback: jest.fn(),
  getFeedbackHistory: jest.fn(),
} as any;

const user = { sub: 'u1' };

describe('LearningController', () => {
  let controller: LearningController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new LearningController(mockService);
  });

  it('registerOutcome delegates to service with userId', async () => {
    const dto = { decisionId: 'd1', patientId: 'p1', followUpDate: '2026-10-15', outcome: 'IMPROVED' as const, validatedBy: 'physician' };
    (mockService.registerOutcome as any).mockResolvedValue({ id: 'o1' });
    const result = await controller.registerOutcome(dto, user);
    expect(mockService.registerOutcome).toHaveBeenCalledWith(dto, 'u1');
    expect((result as any).id).toBe('o1');
  });

  it('findOutcome delegates to service', async () => {
    (mockService.findOutcome as any).mockResolvedValue({ id: 'o1' });
    const result = await controller.findOutcome('o1');
    expect(mockService.findOutcome).toHaveBeenCalledWith('o1');
    expect((result as any).id).toBe('o1');
  });

  it('getModelPerformance passes tenantId', async () => {
    (mockService.getModelPerformance as any).mockResolvedValue([]);
    await controller.getModelPerformance('t1');
    expect(mockService.getModelPerformance).toHaveBeenCalledWith('t1');
  });

  it('getStatistics passes tenantId', async () => {
    (mockService.getStatistics as any).mockResolvedValue({});
    await controller.getStatistics('t1');
    expect(mockService.getStatistics).toHaveBeenCalledWith('t1');
  });

  it('getDriftEvents passes tenantId', async () => {
    (mockService.getDriftEvents as any).mockResolvedValue([]);
    await controller.getDriftEvents('t1');
    expect(mockService.getDriftEvents).toHaveBeenCalledWith('t1');
  });

  it('registerFeedback delegates to service with userId', async () => {
    const dto = { decisionId: 'd1', role: 'PHYSICIAN' as const, classification: 'CORRECT' as const };
    (mockService.registerFeedback as any).mockResolvedValue({ id: 'f1' });
    const result = await controller.registerFeedback(dto, user);
    expect(mockService.registerFeedback).toHaveBeenCalledWith(dto, 'u1');
    expect((result as any).id).toBe('f1');
  });

  it('getFeedbackHistory passes decisionId and tenantId', async () => {
    (mockService.getFeedbackHistory as any).mockResolvedValue([]);
    await controller.getFeedbackHistory('d1', 't1');
    expect(mockService.getFeedbackHistory).toHaveBeenCalledWith('d1', 't1');
  });

  it('getModelPerformance with no tenantId passes undefined', async () => {
    (mockService.getModelPerformance as any).mockResolvedValue([]);
    await controller.getModelPerformance(undefined);
    expect(mockService.getModelPerformance).toHaveBeenCalledWith(undefined);
  });
});
