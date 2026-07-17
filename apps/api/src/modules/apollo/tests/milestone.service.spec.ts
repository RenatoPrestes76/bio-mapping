import { MilestoneService } from '../services/milestone.service.js';
import { MilestoneStatus } from '@bio/database';

const makeMilestoneRepo = (overrides: Record<string, unknown> = {}) => ({
  createMany: jest.fn(),
  findByEnrollment: jest.fn().mockResolvedValue([]),
  findByPatient: jest.fn().mockResolvedValue([]),
  updateProgress: jest.fn().mockResolvedValue({}),
  ...overrides,
});

const makePrisma = (latestMetrics: unknown = null) => ({
  dailyMetrics: {
    findFirst: jest.fn().mockResolvedValue(latestMetrics),
  },
});

describe('MilestoneService', () => {
  describe('getMilestones', () => {
    it('returns milestones for enrollment', async () => {
      const milestones = [{ id: 'm-1', title: 'Perder 2kg', order: 1 }];
      const repo = makeMilestoneRepo({ findByEnrollment: jest.fn().mockResolvedValue(milestones) });
      const service = new MilestoneService(repo as never, makePrisma() as never);
      const result = await service.getMilestones('enroll-1');
      expect(result).toEqual(milestones);
    });
  });

  describe('getMilestonesForPatient', () => {
    it('returns all patient milestones without status filter', async () => {
      const milestones = [{ id: 'm-1' }, { id: 'm-2' }];
      const repo = makeMilestoneRepo({ findByPatient: jest.fn().mockResolvedValue(milestones) });
      const service = new MilestoneService(repo as never, makePrisma() as never);
      const result = await service.getMilestonesForPatient('patient-1');
      expect(result).toHaveLength(2);
    });

    it('passes status filter to repo', async () => {
      const repo = makeMilestoneRepo({ findByPatient: jest.fn().mockResolvedValue([]) });
      const service = new MilestoneService(repo as never, makePrisma() as never);
      await service.getMilestonesForPatient('patient-1', MilestoneStatus.PENDING);
      expect(repo.findByPatient).toHaveBeenCalledWith('patient-1', MilestoneStatus.PENDING);
    });
  });

  describe('checkAndUpdateMilestones', () => {
    it('returns 0 when no pending milestones', async () => {
      const repo = makeMilestoneRepo({ findByPatient: jest.fn().mockResolvedValue([]) });
      const service = new MilestoneService(repo as never, makePrisma() as never);
      const count = await service.checkAndUpdateMilestones('patient-1');
      expect(count).toBe(0);
    });

    it('returns 0 when no metrics data', async () => {
      const milestones = [{ id: 'm-1', metric: 'weight', targetValue: 80, status: MilestoneStatus.PENDING }];
      const repo = makeMilestoneRepo({ findByPatient: jest.fn().mockResolvedValue(milestones) });
      const service = new MilestoneService(repo as never, makePrisma(null) as never);
      const count = await service.checkAndUpdateMilestones('patient-1');
      expect(count).toBe(0);
    });

    it('achieves milestone when absolute target is met (weight <= targetValue)', async () => {
      const milestones = [{ id: 'm-1', metric: 'weight', targetValue: 80, status: MilestoneStatus.PENDING }];
      const repo = makeMilestoneRepo({ findByPatient: jest.fn().mockResolvedValue(milestones) });
      const prisma = makePrisma({ weight: 79, restingHr: null, sleepMinutes: null });
      const service = new MilestoneService(repo as never, prisma as never);
      const count = await service.checkAndUpdateMilestones('patient-1');
      expect(count).toBe(1);
      expect(repo.updateProgress).toHaveBeenCalledWith('m-1', 79, MilestoneStatus.ACHIEVED);
    });

    it('does not achieve milestone when target not met', async () => {
      const milestones = [{ id: 'm-1', metric: 'weight', targetValue: 75, status: MilestoneStatus.PENDING }];
      const repo = makeMilestoneRepo({ findByPatient: jest.fn().mockResolvedValue(milestones) });
      const prisma = makePrisma({ weight: 80, restingHr: null, sleepMinutes: null });
      const service = new MilestoneService(repo as never, prisma as never);
      const count = await service.checkAndUpdateMilestones('patient-1');
      expect(count).toBe(0);
      // Still updates progress
      expect(repo.updateProgress).toHaveBeenCalledWith('m-1', 80);
    });

    it('skips milestones without metric', async () => {
      const milestones = [{ id: 'm-1', metric: null, targetValue: null, status: MilestoneStatus.PENDING }];
      const repo = makeMilestoneRepo({ findByPatient: jest.fn().mockResolvedValue(milestones) });
      const service = new MilestoneService(repo as never, makePrisma({ weight: 80 }) as never);
      const count = await service.checkAndUpdateMilestones('patient-1');
      expect(count).toBe(0);
    });
  });
});
