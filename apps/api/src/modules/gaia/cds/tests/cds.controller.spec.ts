import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CdsController } from '../controllers/cds.controller.js';
import type { CdsService } from '../services/cds.service.js';

const makeService = () => ({
  evaluate: jest.fn(),
  findById: jest.fn(),
  findHistory: jest.fn(),
  recalculate: jest.fn(),
  getExplanation: jest.fn(),
  addFeedback: jest.fn(),
  getAlerts: jest.fn(),
  markAlertRead: jest.fn(),
  createRule: jest.fn(),
});

const USER = { sub: 'u1', role: 'ADMIN' };

describe('CdsController', () => {
  let controller: CdsController;
  let service: ReturnType<typeof makeService>;

  beforeEach(() => {
    service = makeService();
    controller = new CdsController(service as unknown as CdsService);
  });

  it('evaluate delegates to service with the full actor', () => {
    const dto = { patientId: 'p1', variables: { hba1c: 7.0 } };
    controller.evaluate(dto, USER);
    expect(service.evaluate).toHaveBeenCalledWith(dto, USER);
  });

  it('getHistory passes patientId, actor, and limit', () => {
    controller.getHistory('p1', '10', USER);
    expect(service.findHistory).toHaveBeenCalledWith('p1', USER, 10);
  });

  it('getHistory passes undefined limit when not provided', () => {
    controller.getHistory('p1', '', USER);
    expect(service.findHistory).toHaveBeenCalledWith('p1', USER, undefined);
  });

  it('findOne delegates to service with actor', () => {
    controller.findOne('eval-1', USER);
    expect(service.findById).toHaveBeenCalledWith('eval-1', USER);
  });

  it('recalculate delegates with id and actor', () => {
    controller.recalculate('eval-1', USER);
    expect(service.recalculate).toHaveBeenCalledWith('eval-1', USER);
  });

  it('getExplanation delegates to service with actor', () => {
    controller.getExplanation('eval-1', USER);
    expect(service.getExplanation).toHaveBeenCalledWith('eval-1', USER);
  });

  it('addFeedback delegates with id, dto, and actor', () => {
    const dto = { rating: 5, comment: 'Excellent' };
    controller.addFeedback('eval-1', dto, USER);
    expect(service.addFeedback).toHaveBeenCalledWith('eval-1', dto, USER);
  });

  it('getAlerts passes patientId, actor, and unreadOnly flag', () => {
    controller.getAlerts('p1', 'true', USER);
    expect(service.getAlerts).toHaveBeenCalledWith('p1', USER, true);
  });

  it('getAlerts passes false for unreadOnly when not "true"', () => {
    controller.getAlerts('p1', 'false', USER);
    expect(service.getAlerts).toHaveBeenCalledWith('p1', USER, false);
  });

  it('markAlertRead delegates alertId and actor', () => {
    controller.markAlertRead('alert-1', USER);
    expect(service.markAlertRead).toHaveBeenCalledWith('alert-1', USER);
  });
});
