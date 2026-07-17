import { PredictionsService } from '../services/predictions.service';

function makePrisma(metrics: unknown[] = [], tsb?: number) {
  return {
    dailyMetrics: { findMany: jest.fn().mockResolvedValue(metrics) },
    trainingLoad: {
      findFirst: jest.fn().mockResolvedValue(tsb !== undefined ? { tsb, atl: 30, ctl: 20 } : null),
    },
    healthPrediction: {
      deleteMany: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'pred-1', ...data })),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

function makeMetrics(count: number, overrides: Partial<Record<string, number>> = {}) {
  return Array.from({ length: count }, (_, i) => ({
    steps: 8000,
    sleepMinutes: 450,
    avgHeartRate: 70,
    restingHr: 65,
    hrv: 45,
    weight: 75,
    calories: 2200,
    ...overrides,
  }));
}

describe('PredictionsService', () => {
  describe('predictSleep', () => {
    it('returns prediction with trend=STABLE for flat sleep data', () => {
      const service = new PredictionsService(null as any);
      const metrics = makeMetrics(14, { sleepMinutes: 450 });
      const result = service.predictSleep(metrics as any);
      expect(result).toHaveLength(1);
      expect(result[0].metric).toBe('sleepMinutes');
      expect(result[0].trend).toBe('STABLE');
      expect(result[0].riskLevel).toBe('NONE');
    });

    it('detects HIGH risk when predicted sleep < 300 min', () => {
      const service = new PredictionsService(null as any);
      // Declining: 480, 460, 440, ..., down to very low
      const values = Array.from({ length: 14 }, (_, i) => 480 - i * 20);
      const metrics = values.map((v) => ({ sleepMinutes: v }));
      const result = service.predictSleep(metrics as any);
      expect(result[0].riskLevel).toBe('HIGH');
    });

    it('returns empty when fewer than 7 data points', () => {
      const service = new PredictionsService(null as any);
      const result = service.predictSleep(makeMetrics(5) as any);
      expect(result).toHaveLength(0);
    });
  });

  describe('predictCardiovascular', () => {
    it('returns prediction for stable HR', () => {
      const service = new PredictionsService(null as any);
      const result = service.predictCardiovascular(makeMetrics(14, { restingHr: 65 }) as any);
      expect(result[0].metric).toBe('restingHr');
      expect(result[0].trend).toBe('STABLE');
    });

    it('detects DOWN trend for improving HR', () => {
      const service = new PredictionsService(null as any);
      const values = Array.from({ length: 14 }, (_, i) => 80 - i * 1.5);
      const metrics = values.map((v) => ({ restingHr: v }));
      const result = service.predictCardiovascular(metrics as any);
      expect(result[0].trend).toBe('DOWN');
    });
  });

  describe('predictOverloadRisk', () => {
    it('returns HIGH risk for TSB < -30', () => {
      const service = new PredictionsService(null as any);
      const result = service.predictOverloadRisk(-35, 40, 5);
      expect(result[0].riskLevel).toBe('HIGH');
      expect(result[0].metric).toBe('overloadRisk');
    });

    it('returns MEDIUM risk for TSB between -30 and -20', () => {
      const service = new PredictionsService(null as any);
      const result = service.predictOverloadRisk(-25, 35, 10);
      expect(result[0].riskLevel).toBe('MEDIUM');
    });

    it('returns NONE risk for positive TSB', () => {
      const service = new PredictionsService(null as any);
      const result = service.predictOverloadRisk(5);
      expect(result[0].riskLevel).toBe('NONE');
    });

    it('returns empty array when TSB is undefined', () => {
      const service = new PredictionsService(null as any);
      expect(service.predictOverloadRisk(undefined)).toHaveLength(0);
    });
  });

  describe('computePredictions', () => {
    it('creates predictions in DB and returns them', async () => {
      const prisma = makePrisma(makeMetrics(14), 5);
      const service = new PredictionsService(prisma as any);
      const results = await service.computePredictions('p1');
      expect(prisma.healthPrediction.deleteMany).toHaveBeenCalled();
      expect(prisma.healthPrediction.create).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('getPredictions', () => {
    it('returns non-expired predictions', async () => {
      const expected = [{ id: 'pred-1', metric: 'sleepMinutes' }];
      const prisma = makePrisma();
      prisma.healthPrediction.findMany = jest.fn().mockResolvedValue(expected);
      const service = new PredictionsService(prisma as any);
      const results = await service.getPredictions('p1');
      expect(results).toEqual(expected);
    });
  });
});
