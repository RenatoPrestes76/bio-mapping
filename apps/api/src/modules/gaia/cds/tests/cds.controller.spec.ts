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

const USER = { sub: 'u1' };

describe('CdsController', () => {
  let controller: CdsController;
  let service: ReturnType<typeof makeService>;

  beforeEach(() => {
    service = makeService();
    controller = new CdsController(service as unknown as CdsService);
  });

  it('evaluate delegates to service with user sub', () => {
    const dto = { patientId: 'p1', variables: { hba1c: 7.0 } };
    controller.evaluate(dto, USER);
    expect(service.evaluate).toHaveBeenCalledWith(dto, 'u1');
  });

  it('getHistory passes patientId and limit', () => {
    controller.getHistory('p1', '10', USER);
    expect(service.findHistory).toHaveBeenCalledWith('p1', 10);
  });

  it('getHistory passes undefined limit when not provided', () => {
    controller.getHistory('p1', '', USER);
    expect(service.findHistory).toHaveBeenCalledWith('p1', undefined);
  });

  it('findOne delegates to service', () => {
    controller.findOne('eval-1', USER);
    expect(service.findById).toHaveBeenCalledWith('eval-1');
  });

  it('recalculate delegates with id and user', () => {
    controller.recalculate('eval-1', USER);
    expect(service.recalculate).toHaveBeenCalledWith('eval-1', 'u1');
  });

  it('getExplanation delegates to service', () => {
    controller.getExplanation('eval-1', USER);
    expect(service.getExplanation).toHaveBeenCalledWith('eval-1');
  });

  it('addFeedback delegates with id, dto, and user', () => {
    const dto = { rating: 5, comment: 'Excellent' };
    controller.addFeedback('eval-1', dto, USER);
    expect(service.addFeedback).toHaveBeenCalledWith('eval-1', dto, 'u1');
  });

  it('getAlerts passes patientId and unreadOnly flag', () => {
    controller.getAlerts('p1', 'true', USER);
    expect(service.getAlerts).toHaveBeenCalledWith('p1', true);
  });

  it('getAlerts passes false for unreadOnly when not "true"', () => {
    controller.getAlerts('p1', 'false', USER);
    expect(service.getAlerts).toHaveBeenCalledWith('p1', false);
  });

  it('markAlertRead delegates alertId', () => {
    controller.markAlertRead('alert-1', USER);
    expect(service.markAlertRead).toHaveBeenCalledWith('alert-1');
  });
});
