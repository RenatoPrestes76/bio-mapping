import { GoalsService } from '../services/goals.service';
import { GoalStatus, GoalType } from '@bio/database';

function makeGoal(type: GoalType, target: number, overrides: Record<string, unknown> = {}) {
  return {
    id: 'goal-1',
    patientId: 'p1',
    type,
    target,
    unit: 'steps',
    currentValue: null,
    progressPct: null,
    status: GoalStatus.ACTIVE,
    autoAdjust: true,
    startDate: new Date(),
    ...overrides,
  };
}

function makePrisma(goals: unknown[] = [], metrics: unknown[] = []) {
  return {
    userGoal: { findMany: jest.fn().mockResolvedValue(goals) },
    dailyMetrics: { findMany: jest.fn().mockResolvedValue(metrics) },
  };
}

function makeRepo() {
  return {
    findActive: jest.fn().mockResolvedValue([]),
    findActiveByType: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue({ id: 'goal-1' }),
    updateProgress: jest.fn().mockResolvedValue({}),
    adjustTarget: jest.fn().mockResolvedValue({}),
    markAchieved: jest.fn().mockResolvedValue({}),
  };
}

describe('GoalsService', () => {
  describe('initializeGoals', () => {
    it('creates default goals when none exist', async () => {
      const prisma = makePrisma();
      const repo = makeRepo();
      const service = new GoalsService(prisma as any, repo as any);
      await service.initializeGoals('p1');
      // 3 default goals: DAILY_STEPS, SLEEP_DURATION, WEEKLY_TRAINING_SESSIONS
      expect(repo.upsert).toHaveBeenCalledTimes(3);
    });

    it('does not duplicate existing goals', async () => {
      const repo = makeRepo();
      repo.findActiveByType = jest.fn().mockResolvedValue({ id: 'existing' });
      const service = new GoalsService(makePrisma() as any, repo as any);
      await service.initializeGoals('p1');
      expect(repo.upsert).not.toHaveBeenCalled();
    });
  });

  describe('autoAdjustGoals – DAILY_STEPS', () => {
    it('increases target when 7d avg > 110% of target', async () => {
      const goal = makeGoal(GoalType.DAILY_STEPS, 8000);
      const metrics = Array(14).fill({ steps: 9500 }); // avg 9500 > 8800
      const prisma = makePrisma([goal], metrics);
      const repo = makeRepo();
      const service = new GoalsService(prisma as any, repo as any);
      const results = await service.autoAdjustGoals('p1');
      expect(repo.adjustTarget).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].type).toBe(GoalType.DAILY_STEPS);
      expect(results[0].to).toBeGreaterThan(8000);
    });

    it('decreases target when 7d avg < 60% of target', async () => {
      const goal = makeGoal(GoalType.DAILY_STEPS, 10000);
      const metrics = Array(14).fill({ steps: 4000 }); // avg 4000 < 6000
      const prisma = makePrisma([goal], metrics);
      const repo = makeRepo();
      const service = new GoalsService(prisma as any, repo as any);
      const results = await service.autoAdjustGoals('p1');
      expect(repo.adjustTarget).toHaveBeenCalled();
      expect(results[0].to).toBeLessThan(10000);
    });

    it('does not adjust when within acceptable range', async () => {
      const goal = makeGoal(GoalType.DAILY_STEPS, 8000);
      const metrics = Array(14).fill({ steps: 8200 }); // within range
      const prisma = makePrisma([goal], metrics);
      const repo = makeRepo();
      const service = new GoalsService(prisma as any, repo as any);
      const results = await service.autoAdjustGoals('p1');
      expect(repo.adjustTarget).not.toHaveBeenCalled();
      expect(results).toHaveLength(0);
    });

    it('skips adjustment when not enough step data', async () => {
      const goal = makeGoal(GoalType.DAILY_STEPS, 8000);
      const metrics = Array(5).fill({ steps: 9500 }); // < 7 days
      const prisma = makePrisma([goal], metrics);
      const repo = makeRepo();
      const service = new GoalsService(prisma as any, repo as any);
      const results = await service.autoAdjustGoals('p1');
      expect(results).toHaveLength(0);
    });
  });

  describe('autoAdjustGoals – SLEEP_DURATION', () => {
    it('updates progress for sleep goal without adjusting target', async () => {
      const goal = makeGoal(GoalType.SLEEP_DURATION, 480, { unit: 'minutes' });
      const metrics = Array(14).fill({ sleepMinutes: 420 });
      const prisma = makePrisma([goal], metrics);
      const repo = makeRepo();
      const service = new GoalsService(prisma as any, repo as any);
      await service.autoAdjustGoals('p1');
      expect(repo.updateProgress).toHaveBeenCalled();
      expect(repo.adjustTarget).not.toHaveBeenCalled();
    });
  });

  describe('setGoal', () => {
    it('calls upsert with correct type and target', async () => {
      const repo = makeRepo();
      const service = new GoalsService(makePrisma() as any, repo as any);
      await service.setGoal('p1', GoalType.WEIGHT, 75, 'Lose weight');
      expect(repo.upsert).toHaveBeenCalledWith(
        'p1',
        GoalType.WEIGHT,
        expect.objectContaining({ target: 75, unit: 'kg', notes: 'Lose weight' }),
      );
    });
  });

  describe('evaluateProgress', () => {
    it('maps goal records to GoalProgress shape', async () => {
      const repo = makeRepo();
      repo.findActive = jest.fn().mockResolvedValue([
        { id: 'g1', type: GoalType.DAILY_STEPS, target: 8000, currentValue: 7500, progressPct: 93.8, status: GoalStatus.ACTIVE, unit: 'steps', history: [] },
      ]);
      const service = new GoalsService(makePrisma() as any, repo as any);
      const progress = await service.evaluateProgress('p1');
      expect(progress).toHaveLength(1);
      expect(progress[0].goalId).toBe('g1');
      expect(progress[0].progressPct).toBe(93.8);
    });
  });
});
