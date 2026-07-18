import { TimelineEventSeverity, TimelineEventType } from '@bio/database';
import { PrismaPatientTimelineRepository } from '../repositories/prisma-patient-timeline.repository.js';

const event = {
  id: 'evt-1', patientId: 'p-1', eventType: TimelineEventType.DECISION_CREATED,
  severity: TimelineEventSeverity.HIGH, title: 'Decisão criada', occurredAt: new Date(),
};

const makePrisma = (overrides: Record<string, unknown> = {}) => ({
  patientTimelineEvent: {
    create: jest.fn().mockResolvedValue(event),
    findMany: jest.fn().mockResolvedValue([event]),
    count: jest.fn().mockResolvedValue(3),
    ...overrides,
  },
});

describe('PrismaPatientTimelineRepository', () => {
  describe('create', () => {
    it('creates a timeline event', async () => {
      const prisma = makePrisma();
      const repo = new PrismaPatientTimelineRepository(prisma as never);
      const result = await repo.create({
        patientId: 'p-1',
        eventType: TimelineEventType.DECISION_CREATED,
        severity: TimelineEventSeverity.HIGH,
        title: 'Decisão criada',
      });
      expect(result).toBe(event);
      expect(prisma.patientTimelineEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ patientId: 'p-1' }) }),
      );
    });

    it('uses provided occurredAt when given', async () => {
      const prisma = makePrisma();
      const repo = new PrismaPatientTimelineRepository(prisma as never);
      const customDate = new Date('2024-01-01');
      await repo.create({ patientId: 'p-1', eventType: TimelineEventType.MANUAL_NOTE, title: 'Note', occurredAt: customDate });
      const call = (prisma.patientTimelineEvent.create as jest.Mock).mock.calls[0][0];
      expect(call.data.occurredAt).toBe(customDate);
    });

    it('defaults occurredAt to now when not provided', async () => {
      const prisma = makePrisma();
      const repo = new PrismaPatientTimelineRepository(prisma as never);
      const before = Date.now();
      await repo.create({ patientId: 'p-1', eventType: TimelineEventType.MANUAL_NOTE, title: 'Note' });
      const after = Date.now();
      const call = (prisma.patientTimelineEvent.create as jest.Mock).mock.calls[0][0];
      const occurredAt = call.data.occurredAt as Date;
      expect(occurredAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(occurredAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('findByPatient', () => {
    it('queries by patientId ordered by occurredAt desc', async () => {
      const prisma = makePrisma();
      const repo = new PrismaPatientTimelineRepository(prisma as never);
      const result = await repo.findByPatient({ patientId: 'p-1' });
      expect(prisma.patientTimelineEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientId: 'p-1' },
          orderBy: { occurredAt: 'desc' },
        }),
      );
      expect(result).toEqual([event]);
    });

    it('adds eventType filter when provided', async () => {
      const prisma = makePrisma();
      const repo = new PrismaPatientTimelineRepository(prisma as never);
      await repo.findByPatient({ patientId: 'p-1', eventType: TimelineEventType.DECISION_CREATED });
      expect(prisma.patientTimelineEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ eventType: TimelineEventType.DECISION_CREATED }),
        }),
      );
    });

    it('adds severity filter when provided', async () => {
      const prisma = makePrisma();
      const repo = new PrismaPatientTimelineRepository(prisma as never);
      await repo.findByPatient({ patientId: 'p-1', severity: TimelineEventSeverity.CRITICAL });
      expect(prisma.patientTimelineEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ severity: TimelineEventSeverity.CRITICAL }),
        }),
      );
    });

    it('adds date range filter when from/to provided', async () => {
      const prisma = makePrisma();
      const repo = new PrismaPatientTimelineRepository(prisma as never);
      const from = new Date('2024-01-01');
      const to = new Date('2024-01-31');
      await repo.findByPatient({ patientId: 'p-1', from, to });
      expect(prisma.patientTimelineEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ occurredAt: { gte: from, lte: to } }),
        }),
      );
    });

    it('applies pagination via take and skip', async () => {
      const prisma = makePrisma();
      const repo = new PrismaPatientTimelineRepository(prisma as never);
      await repo.findByPatient({ patientId: 'p-1', limit: 10, offset: 20 });
      expect(prisma.patientTimelineEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 20 }),
      );
    });
  });

  describe('countByPatient', () => {
    it('returns the count of events for a patient', async () => {
      const prisma = makePrisma();
      const repo = new PrismaPatientTimelineRepository(prisma as never);
      const count = await repo.countByPatient('p-1');
      expect(count).toBe(3);
      expect(prisma.patientTimelineEvent.count).toHaveBeenCalledWith({ where: { patientId: 'p-1' } });
    });
  });
});
