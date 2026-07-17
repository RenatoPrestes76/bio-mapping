import { InsightEngineService } from '../services/insight-engine.service';
import { InsightCategory, InsightPriority } from '@bio/database';

function makeMetrics(overrides: Array<Record<string, unknown>> = []) {
  return overrides.map((o) => ({
    date: new Date('2025-03-01'),
    steps: null,
    calories: null,
    sleepMinutes: null,
    avgHeartRate: null,
    restingHr: null,
    hrv: null,
    spo2: null,
    weight: null,
    bodyFat: null,
    ...o,
  }));
}

function makePrisma(metrics: unknown[] = []) {
  return {
    dailyMetrics: { findMany: jest.fn().mockResolvedValue(metrics) },
    trainingLoad: { findFirst: jest.fn().mockResolvedValue(null) },
  };
}

function makeInsightRepo() {
  return {
    expireOld: jest.fn().mockResolvedValue({}),
    existsToday: jest.fn().mockResolvedValue(false),
    create: jest.fn().mockResolvedValue({}),
  };
}

function makeService(metrics: unknown[] = [], tsb?: number) {
  const prisma = makePrisma(metrics);
  if (tsb !== undefined) {
    prisma.trainingLoad.findFirst = jest.fn().mockResolvedValue({ tsb, atl: 30, ctl: 25 });
  }
  const repo = makeInsightRepo();
  return { service: new InsightEngineService(prisma as any, repo as any), repo, prisma };
}

describe('InsightEngineService', () => {
  describe('analyzeSleep', () => {
    it('detects significant sleep decline (>20%)', () => {
      const service = new InsightEngineService(null as any, null as any);
      // prior7: avg 480min, recent7: avg 360min → 25% drop
      const prior7 = Array(7).fill({ sleepMinutes: 480 });
      const recent7 = Array(7).fill({ sleepMinutes: 360 });
      const metrics = makeMetrics([...prior7, ...recent7]);
      const results = service.analyzeSleep(metrics);
      expect(results.some((r) => r.insightType === 'SLEEP_DECLINE_SIGNIFICANT')).toBe(true);
    });

    it('detects mild sleep decline (10-20%)', () => {
      const service = new InsightEngineService(null as any, null as any);
      const prior7 = Array(7).fill({ sleepMinutes: 480 });
      const recent7 = Array(7).fill({ sleepMinutes: 420 }); // 12.5% drop
      const metrics = makeMetrics([...prior7, ...recent7]);
      const results = service.analyzeSleep(metrics);
      expect(results.some((r) => r.insightType === 'SLEEP_DECLINE_MILD')).toBe(true);
    });

    it('detects sleep improvement', () => {
      const service = new InsightEngineService(null as any, null as any);
      const prior7 = Array(7).fill({ sleepMinutes: 360 });
      const recent7 = Array(7).fill({ sleepMinutes: 450 }); // +25%
      const metrics = makeMetrics([...prior7, ...recent7]);
      const results = service.analyzeSleep(metrics);
      expect(results.some((r) => r.insightType === 'SLEEP_IMPROVING')).toBe(true);
    });

    it('detects insufficient sleep (< 6h avg)', () => {
      const service = new InsightEngineService(null as any, null as any);
      const metrics = makeMetrics(Array(14).fill({ sleepMinutes: 300 }));
      const results = service.analyzeSleep(metrics);
      expect(results.some((r) => r.insightType === 'SLEEP_INSUFFICIENT')).toBe(true);
    });

    it('returns empty when not enough data', () => {
      const service = new InsightEngineService(null as any, null as any);
      const results = service.analyzeSleep(makeMetrics(Array(5).fill({ sleepMinutes: 400 })));
      expect(results).toHaveLength(0);
    });
  });

  describe('analyzeHeartRate', () => {
    it('detects improving HR (slope down > 3 bpm total)', () => {
      const service = new InsightEngineService(null as any, null as any);
      // Decreasing: 75, 73, 71, 69, 67, 65, 63 → slope ≈ -2 bpm/day → total ≈ -12
      const metrics = makeMetrics([75, 73, 71, 69, 67, 65, 63].map((v) => ({ restingHr: v })));
      const results = service.analyzeHeartRate(metrics);
      expect(results.some((r) => r.insightType === 'HR_IMPROVING')).toBe(true);
    });

    it('detects HR elevation (slope up > 5 bpm total)', () => {
      const service = new InsightEngineService(null as any, null as any);
      const metrics = makeMetrics([60, 62, 65, 68, 71, 74, 77].map((v) => ({ restingHr: v })));
      const results = service.analyzeHeartRate(metrics);
      expect(results.some((r) => r.insightType === 'HR_ELEVATION')).toBe(true);
    });

    it('returns empty when HR is stable', () => {
      const service = new InsightEngineService(null as any, null as any);
      const metrics = makeMetrics(Array(7).fill({ restingHr: 65 }));
      const results = service.analyzeHeartRate(metrics);
      expect(results).toHaveLength(0);
    });
  });

  describe('analyzeHRV', () => {
    it('detects HRV improvement (>5%)', () => {
      const service = new InsightEngineService(null as any, null as any);
      const prior7 = Array(7).fill({ hrv: 40 });
      const recent7 = Array(7).fill({ hrv: 46 }); // +15%
      const metrics = makeMetrics([...prior7, ...recent7]);
      const results = service.analyzeHRV(metrics);
      expect(results.some((r) => r.insightType === 'HRV_IMPROVING')).toBe(true);
      expect(results[0].category).toBe(InsightCategory.HRV);
      expect(results[0].priority).toBe(InsightPriority.INFORMATIVO);
    });

    it('detects HRV decline (>10%)', () => {
      const service = new InsightEngineService(null as any, null as any);
      const prior7 = Array(7).fill({ hrv: 50 });
      const recent7 = Array(7).fill({ hrv: 42 }); // -16%
      const metrics = makeMetrics([...prior7, ...recent7]);
      const results = service.analyzeHRV(metrics);
      expect(results.some((r) => r.insightType === 'HRV_DECLINING')).toBe(true);
      expect(results[0].priority).toBe(InsightPriority.ATENCAO);
    });
  });

  describe('analyzeActivity', () => {
    it('detects critical activity drop (>50%)', () => {
      const service = new InsightEngineService(null as any, null as any);
      const baseline = Array(11).fill({ steps: 8000 });
      const recent3 = Array(3).fill({ steps: 2000 }); // -75%
      const metrics = makeMetrics([...baseline, ...recent3]);
      const results = service.analyzeActivity(metrics);
      expect(results.some((r) => r.insightType === 'ACTIVITY_DROP_CRITICAL')).toBe(true);
      expect(results[0].priority).toBe(InsightPriority.ALTA_PRIORIDADE);
    });

    it('detects moderate activity drop (20-50%)', () => {
      const service = new InsightEngineService(null as any, null as any);
      const baseline = Array(11).fill({ steps: 8000 });
      const recent3 = Array(3).fill({ steps: 5000 }); // -37.5%
      const metrics = makeMetrics([...baseline, ...recent3]);
      const results = service.analyzeActivity(metrics);
      expect(results.some((r) => r.insightType === 'ACTIVITY_DROP')).toBe(true);
    });

    it('detects activity improvement (>20%)', () => {
      const service = new InsightEngineService(null as any, null as any);
      const baseline = Array(11).fill({ steps: 5000 });
      const recent3 = Array(3).fill({ steps: 7000 }); // +40%
      const metrics = makeMetrics([...baseline, ...recent3]);
      const results = service.analyzeActivity(metrics);
      expect(results.some((r) => r.insightType === 'ACTIVITY_IMPROVING')).toBe(true);
    });
  });

  describe('analyzeTrainingLoad', () => {
    it('returns ALTA_PRIORIDADE for TSB < -30', () => {
      const service = new InsightEngineService(null as any, null as any);
      const results = service.analyzeTrainingLoad(-35, 40, 5);
      expect(results[0].insightType).toBe('TRAINING_OVERLOAD_CRITICAL');
      expect(results[0].priority).toBe(InsightPriority.ALTA_PRIORIDADE);
    });

    it('returns IMPORTANTE for TSB between -30 and -20', () => {
      const service = new InsightEngineService(null as any, null as any);
      const results = service.analyzeTrainingLoad(-25, 35, 10);
      expect(results[0].insightType).toBe('TRAINING_OVERLOAD_HIGH');
      expect(results[0].priority).toBe(InsightPriority.IMPORTANTE);
    });

    it('returns INFORMATIVO for TSB in optimal zone', () => {
      const service = new InsightEngineService(null as any, null as any);
      const results = service.analyzeTrainingLoad(15, 25, 40);
      expect(results[0].insightType).toBe('TRAINING_OPTIMAL');
      expect(results[0].priority).toBe(InsightPriority.INFORMATIVO);
    });

    it('returns empty for undefined TSB', () => {
      const service = new InsightEngineService(null as any, null as any);
      const results = service.analyzeTrainingLoad(undefined);
      expect(results).toHaveLength(0);
    });
  });

  describe('analyzeCardiovascularComposite', () => {
    it('detects composite progress (HR down + HRV up)', () => {
      const service = new InsightEngineService(null as any, null as any);
      const prior7 = Array(7).fill({ restingHr: 70, hrv: 40 });
      const recent7 = Array(7).fill({ restingHr: 65, hrv: 45 }); // HR -5 + HRV +12.5%
      const metrics = makeMetrics([...prior7, ...recent7]);
      const results = service.analyzeCardiovascularComposite(metrics);
      expect(results.some((r) => r.insightType === 'CARDIOVASCULAR_PROGRESS')).toBe(true);
    });
  });

  describe('generateInsights – full pipeline', () => {
    it('calls expireOld and skips dedup on same day', async () => {
      const prisma = makePrisma(makeMetrics(Array(14).fill({ sleepMinutes: 300 })));
      const repo = {
        ...makeInsightRepo(),
        existsToday: jest.fn().mockResolvedValue(true), // already exists
      };
      const service = new InsightEngineService(prisma as any, repo as any);
      const count = await service.generateInsights('p1');
      expect(repo.expireOld).toHaveBeenCalledWith('p1');
      expect(repo.create).not.toHaveBeenCalled();
      expect(count).toBe(0);
    });
  });
});
