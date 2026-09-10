import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TimelineEventSeverity, TimelineEventType } from '@bio/database';
import { PatientMonitoringService } from '../services/patient-monitoring.service.js';

const ADMIN = { sub: 'admin-1', role: 'ADMIN' };
const PATIENT_OWNER = { sub: 'user-1', role: 'PATIENT' };
const PATIENT_OTHER = { sub: 'user-2', role: 'PATIENT' };

const event = {
  id: 'evt-1', patientId: 'p-1', eventType: TimelineEventType.DECISION_CREATED,
  severity: TimelineEventSeverity.HIGH, title: 'Decisão', sourceId: 'dec-1',
  sourceTable: 'clinical_decisions', occurredAt: new Date(),
};

const makeRepo = () => ({
  findByPatient: jest.fn().mockResolvedValue([event]),
  create: jest.fn().mockResolvedValue(event),
  countByPatient: jest.fn().mockResolvedValue(1),
});

const makeAggregator = () => ({
  aggregate: jest.fn().mockResolvedValue([event]),
});

const makePrisma = (counts = { open: 2, critical: 1, pathways: 1, recommendations: 3, predictions: 4 }) => ({
  clinicalDecision: {
    count: jest.fn()
      .mockResolvedValueOnce(counts.open)
      .mockResolvedValueOnce(counts.critical),
  },
  clinicalPathway: {
    count: jest.fn().mockResolvedValue(counts.pathways),
  },
  recommendation: {
    count: jest.fn().mockResolvedValue(counts.recommendations),
  },
  healthPrediction: {
    count: jest.fn().mockResolvedValue(counts.predictions),
  },
  patient: {
    findFirst: jest.fn().mockResolvedValue({ id: 'p-1', userId: 'user-1', primaryProfessionalId: null, deletedAt: null }),
  },
  professional: {
    findFirst: jest.fn().mockResolvedValue(null),
  },
});

const makeAudit = () => ({ log: jest.fn().mockResolvedValue(undefined) });

describe('PatientMonitoringService', () => {
  describe('getTimeline', () => {
    it('delegates to aggregator and returns events', async () => {
      const aggregator = makeAggregator();
      const audit = makeAudit();
      const service = new PatientMonitoringService(makeRepo() as never, aggregator as never, makePrisma() as never, audit as never);
      const result = await service.getTimeline('p-1', 50, PATIENT_OWNER);
      expect(aggregator.aggregate).toHaveBeenCalledWith('p-1', 50);
      expect(result).toEqual([event]);
    });

    it('logs TIMELINE_QUERIED audit event', async () => {
      const audit = makeAudit();
      const service = new PatientMonitoringService(makeRepo() as never, makeAggregator() as never, makePrisma() as never, audit as never);
      await service.getTimeline('p-1', 100, PATIENT_OWNER);
      expect(audit.log).toHaveBeenCalledWith('TIMELINE_QUERIED', expect.objectContaining({ userId: 'user-1' }));
    });

    it('uses default limit of 100 when not provided', async () => {
      const aggregator = makeAggregator();
      const service = new PatientMonitoringService(makeRepo() as never, aggregator as never, makePrisma() as never, makeAudit() as never);
      await service.getTimeline('p-1');
      expect(aggregator.aggregate).toHaveBeenCalledWith('p-1', 100);
    });

    it('allows ADMIN regardless of ownership', async () => {
      const prisma = makePrisma();
      const service = new PatientMonitoringService(makeRepo() as never, makeAggregator() as never, prisma as never, makeAudit() as never);
      await expect(service.getTimeline('p-1', 100, ADMIN)).resolves.toEqual([event]);
      expect(prisma.patient.findFirst).not.toHaveBeenCalled();
    });

    it('SECURITY (IDOR): a different patient cannot read someone else\'s timeline', async () => {
      const prisma = makePrisma();
      const service = new PatientMonitoringService(makeRepo() as never, makeAggregator() as never, prisma as never, makeAudit() as never);
      await expect(service.getTimeline('p-1', 100, PATIENT_OTHER)).rejects.toThrow(ForbiddenException);
    });

    it('SECURITY: throws NotFoundException when the patient does not exist', async () => {
      const prisma = makePrisma();
      (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);
      const service = new PatientMonitoringService(makeRepo() as never, makeAggregator() as never, prisma as never, makeAudit() as never);
      await expect(service.getTimeline('ghost', 100, PATIENT_OWNER)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSummary', () => {
    it('returns aggregated counts from source tables', async () => {
      const audit = makeAudit();
      const service = new PatientMonitoringService(makeRepo() as never, makeAggregator() as never, makePrisma() as never, audit as never);
      const result = await service.getSummary('p-1', PATIENT_OWNER);
      expect(result.patientId).toBe('p-1');
      expect(result.openDecisions).toBe(2);
      expect(result.criticalDecisions).toBe(1);
      expect(result.activePathways).toBe(1);
      expect(result.pendingRecommendations).toBe(3);
      expect(result.recentPredictions).toBe(4);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('logs SUMMARY_QUERIED audit event', async () => {
      const audit = makeAudit();
      const service = new PatientMonitoringService(makeRepo() as never, makeAggregator() as never, makePrisma() as never, audit as never);
      await service.getSummary('p-1', PATIENT_OWNER);
      expect(audit.log).toHaveBeenCalledWith('SUMMARY_QUERIED', expect.objectContaining({ userId: 'user-1' }));
    });

    it('SECURITY (IDOR): a different patient cannot read someone else\'s summary', async () => {
      const prisma = makePrisma();
      const service = new PatientMonitoringService(makeRepo() as never, makeAggregator() as never, prisma as never, makeAudit() as never);
      await expect(service.getSummary('p-1', PATIENT_OTHER)).rejects.toThrow(ForbiddenException);
    });

    it('SECURITY (IDOR): a PROFESSIONAL with no link to the patient is denied', async () => {
      const prisma = makePrisma();
      const service = new PatientMonitoringService(makeRepo() as never, makeAggregator() as never, prisma as never, makeAudit() as never);
      await expect(service.getSummary('p-1', { sub: 'prof-1', role: 'PROFESSIONAL' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getEvents', () => {
    it('returns stored PatientTimelineEvent records for a patient', async () => {
      const repo = makeRepo();
      const service = new PatientMonitoringService(repo as never, makeAggregator() as never, makePrisma() as never, makeAudit() as never);
      const result = await service.getEvents('p-1', { limit: 10, offset: 0 }, PATIENT_OWNER);
      expect(repo.findByPatient).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'p-1', limit: 10, offset: 0 }));
      expect(result).toEqual([event]);
    });

    it('logs TIMELINE_QUERIED audit event with source=events', async () => {
      const audit = makeAudit();
      const service = new PatientMonitoringService(makeRepo() as never, makeAggregator() as never, makePrisma() as never, audit as never);
      await service.getEvents('p-1', {}, PATIENT_OWNER);
      expect(audit.log).toHaveBeenCalledWith('TIMELINE_QUERIED', expect.objectContaining({
        metadata: expect.objectContaining({ source: 'events' }),
      }));
    });

    it('merges patientId into filters', async () => {
      const repo = makeRepo();
      const service = new PatientMonitoringService(repo as never, makeAggregator() as never, makePrisma() as never, makeAudit() as never);
      await service.getEvents('p-1', { limit: 5 });
      expect(repo.findByPatient).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'p-1', limit: 5 }));
    });

    it('SECURITY (IDOR): a different patient cannot read someone else\'s events', async () => {
      const prisma = makePrisma();
      const service = new PatientMonitoringService(makeRepo() as never, makeAggregator() as never, prisma as never, makeAudit() as never);
      await expect(service.getEvents('p-1', {}, PATIENT_OTHER)).rejects.toThrow(ForbiddenException);
    });
  });
});
