import { TimelineEventSeverity, TimelineEventType } from '@bio/database';
import { PatientMonitoringController } from '../controllers/patient-monitoring.controller.js';

const user = { sub: 'user-1' };

const event = {
  id: 'evt-1', patientId: 'p-1', eventType: TimelineEventType.DECISION_CREATED,
  severity: TimelineEventSeverity.HIGH, title: 'Decisão', sourceId: 'dec-1',
  sourceTable: 'clinical_decisions', occurredAt: new Date(),
};

const summary = {
  patientId: 'p-1', openDecisions: 2, criticalDecisions: 1,
  activePathways: 1, pendingRecommendations: 3, recentPredictions: 4, generatedAt: new Date(),
};

const makeService = (overrides: Record<string, unknown> = {}) => ({
  getTimeline: jest.fn().mockResolvedValue([event]),
  getSummary: jest.fn().mockResolvedValue(summary),
  getEvents: jest.fn().mockResolvedValue([event]),
  ...overrides,
});

describe('PatientMonitoringController', () => {
  describe('getTimeline', () => {
    it('delegates to service with patientId and userId', async () => {
      const service = makeService();
      const controller = new PatientMonitoringController(service as never);
      const result = await controller.getTimeline('p-1', user);
      expect(service.getTimeline).toHaveBeenCalledWith('p-1', 100, 'user-1');
      expect(result).toEqual([event]);
    });

    it('parses limit query param as number', async () => {
      const service = makeService();
      const controller = new PatientMonitoringController(service as never);
      await controller.getTimeline('p-1', user, '50');
      expect(service.getTimeline).toHaveBeenCalledWith('p-1', 50, 'user-1');
    });

    it('uses default limit 100 when no limit query param given', async () => {
      const service = makeService();
      const controller = new PatientMonitoringController(service as never);
      await controller.getTimeline('p-1', user, undefined);
      expect(service.getTimeline).toHaveBeenCalledWith('p-1', 100, 'user-1');
    });
  });

  describe('getSummary', () => {
    it('delegates to service and returns summary', async () => {
      const service = makeService();
      const controller = new PatientMonitoringController(service as never);
      const result = await controller.getSummary('p-1', user);
      expect(service.getSummary).toHaveBeenCalledWith('p-1', 'user-1');
      expect(result).toBe(summary);
    });
  });

  describe('getEvents', () => {
    it('delegates to service with patientId and userId', async () => {
      const service = makeService();
      const controller = new PatientMonitoringController(service as never);
      const result = await controller.getEvents('p-1', user);
      expect(service.getEvents).toHaveBeenCalledWith('p-1', { limit: 50, offset: 0 }, 'user-1');
      expect(result).toEqual([event]);
    });

    it('parses limit and offset query params as numbers', async () => {
      const service = makeService();
      const controller = new PatientMonitoringController(service as never);
      await controller.getEvents('p-1', user, '20', '40');
      expect(service.getEvents).toHaveBeenCalledWith('p-1', { limit: 20, offset: 40 }, 'user-1');
    });

    it('uses default limit 50 and offset 0 when not provided', async () => {
      const service = makeService();
      const controller = new PatientMonitoringController(service as never);
      await controller.getEvents('p-1', user, undefined, undefined);
      expect(service.getEvents).toHaveBeenCalledWith('p-1', { limit: 50, offset: 0 }, 'user-1');
    });
  });
});
