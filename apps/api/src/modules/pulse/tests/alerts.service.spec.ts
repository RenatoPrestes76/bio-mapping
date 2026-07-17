import { PulseAlertsService } from '../services/alerts.service';
import { AlertType, AlertSeverity } from '@bio/database';

function makeMetricsRepo(data: unknown[]) {
  return { findRange: jest.fn().mockResolvedValue(data) };
}

function makeLoadRepo(latest: unknown) {
  return { findLatest: jest.fn().mockResolvedValue(latest) };
}

function makePrisma(existingAlert: unknown = null, sources: unknown[] = []) {
  return {
    alert: {
      findFirst: jest.fn().mockResolvedValue(existingAlert),
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    healthSource: {
      findMany: jest.fn().mockResolvedValue(sources),
    },
  };
}

function dayMetric(overrides: Record<string, unknown> = {}) {
  return {
    steps: 8000,
    sleepMinutes: 440,
    restingHr: 62,
    avgHeartRate: 70,
    calories: 2200,
    date: new Date(),
    ...overrides,
  };
}

describe('PulseAlertsService – alert checkers (private, tested via evaluateAndCreate)', () => {
  describe('ACTIVITY_DROP', () => {
    it('50%+ drop in steps over 3 days creates alert', async () => {
      // Baseline (days 4-14): 8000 steps. Recent (last 3): 2000 steps
      const baseline = Array(11).fill(null).map(() => dayMetric({ steps: 8000 }));
      const recent = Array(3).fill(null).map(() => dayMetric({ steps: 2000 }));
      const repo = makeMetricsRepo([...baseline, ...recent]);
      const prisma = makePrisma(null, []);
      const service = new PulseAlertsService(prisma as any, repo as any, makeLoadRepo(null) as any);
      const count = await service.evaluateAndCreate('p1');
      expect(count).toBeGreaterThan(0);
      const types = (prisma.alert.create as jest.Mock).mock.calls.map(([{ data }]: any) => data.type);
      expect(types).toContain(AlertType.ACTIVITY_DROP);
    });

    it('no drop → no alert', async () => {
      const data = Array(14).fill(null).map(() => dayMetric({ steps: 8000 }));
      const repo = makeMetricsRepo(data);
      const prisma = makePrisma(null, []);
      const service = new PulseAlertsService(prisma as any, repo as any, makeLoadRepo(null) as any);
      const count = await service.evaluateAndCreate('p1');
      expect(count).toBe(0);
    });
  });

  describe('PERSISTENT_SLEEP_DECLINE', () => {
    it('5 nights < 6h triggers alert', async () => {
      const data = Array(30).fill(null).map((_, i) =>
        i >= 25 ? dayMetric({ sleepMinutes: 300 }) : dayMetric(),
      );
      const repo = makeMetricsRepo(data);
      const prisma = makePrisma(null, []);
      const service = new PulseAlertsService(prisma as any, repo as any, makeLoadRepo(null) as any);
      await service.evaluateAndCreate('p1');
      const types = (prisma.alert.create as jest.Mock).mock.calls.map(([{ data: d }]: any) => d.type);
      expect(types).toContain(AlertType.PERSISTENT_SLEEP_DECLINE);
    });

    it('only 3 bad nights → no alert (needs 5)', async () => {
      const data = Array(30).fill(null).map((_, i) =>
        i >= 27 ? dayMetric({ sleepMinutes: 300 }) : dayMetric(),
      );
      const repo = makeMetricsRepo(data);
      const prisma = makePrisma(null, []);
      const service = new PulseAlertsService(prisma as any, repo as any, makeLoadRepo(null) as any);
      await service.evaluateAndCreate('p1');
      const types = (prisma.alert.create as jest.Mock).mock.calls.map(([{ data: d }]: any) => d.type);
      expect(types).not.toContain(AlertType.PERSISTENT_SLEEP_DECLINE);
    });
  });

  describe('TRAINING_OVERLOAD', () => {
    it('TSB < -30 triggers CRITICAL alert', async () => {
      const repo = makeMetricsRepo(Array(14).fill(null).map(() => dayMetric()));
      const prisma = makePrisma(null, []);
      const service = new PulseAlertsService(
        prisma as any,
        repo as any,
        makeLoadRepo({ tsb: -35 }) as any,
      );
      await service.evaluateAndCreate('p1');
      const calls = (prisma.alert.create as jest.Mock).mock.calls;
      const overload = calls.find(([{ data: d }]: any) => d.type === AlertType.TRAINING_OVERLOAD);
      expect(overload).toBeDefined();
      expect(overload![0].data.severity).toBe(AlertSeverity.CRITICAL);
    });

    it('TSB = -25 → no overtraining alert', async () => {
      const repo = makeMetricsRepo(Array(14).fill(null).map(() => dayMetric()));
      const prisma = makePrisma(null, []);
      const service = new PulseAlertsService(
        prisma as any,
        repo as any,
        makeLoadRepo({ tsb: -25 }) as any,
      );
      await service.evaluateAndCreate('p1');
      const types = (prisma.alert.create as jest.Mock).mock.calls.map(([{ data: d }]: any) => d.type);
      expect(types).not.toContain(AlertType.TRAINING_OVERLOAD);
    });
  });

  describe('SYNC_ABSENCE', () => {
    it('connected source with no sync > 5 days creates INFO alert', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      const repo = makeMetricsRepo([]);
      const prisma = makePrisma(null, [{
        platform: 'GARMIN',
        status: 'CONNECTED',
        lastSyncAt: oldDate,
      }]);
      const service = new PulseAlertsService(prisma as any, repo as any, makeLoadRepo(null) as any);
      await service.evaluateAndCreate('p1');
      const types = (prisma.alert.create as jest.Mock).mock.calls.map(([{ data: d }]: any) => d.type);
      expect(types).toContain(AlertType.SYNC_ABSENCE);
    });
  });

  describe('deduplication', () => {
    it('does not create duplicate alert for same unresolved type', async () => {
      const data = Array(14).fill(null).map(() => dayMetric({ steps: 2000 }));
      const repo = makeMetricsRepo(data);
      // Return existing unresolved ACTIVITY_DROP alert
      const prisma = makePrisma({ id: 'existing', type: AlertType.ACTIVITY_DROP }, []);
      const service = new PulseAlertsService(prisma as any, repo as any, makeLoadRepo(null) as any);
      await service.evaluateAndCreate('p1');
      const types = (prisma.alert.create as jest.Mock).mock.calls.map(([{ data: d }]: any) => d.type);
      expect(types).not.toContain(AlertType.ACTIVITY_DROP);
    });
  });
});
