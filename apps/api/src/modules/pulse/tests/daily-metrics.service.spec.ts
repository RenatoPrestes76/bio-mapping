import { DailyMetricsService } from '../services/daily-metrics.service';
import { OracleMetricType } from '@bio/database';

function makeRecord(type: OracleMetricType, value: number, ts?: Date) {
  return {
    metricType: type,
    value,
    unit: 'bpm',
    recordedAt: ts ?? new Date('2025-03-01T10:00:00Z'),
    isValid: true,
    isDuplicate: false,
    source: 'SIMULATOR',
  };
}

function makePrisma(records: unknown[]) {
  return {
    normalizedHealthData: {
      findMany: jest.fn().mockResolvedValue(records),
    },
  };
}

function makeRepo() {
  return { upsert: jest.fn().mockResolvedValue({}) };
}

describe('DailyMetricsService', () => {
  it('aggregates steps as sum', async () => {
    const prisma = makePrisma([
      makeRecord(OracleMetricType.STEPS, 3000),
      makeRecord(OracleMetricType.STEPS, 5000),
    ]);
    const repo = makeRepo();
    const service = new DailyMetricsService(prisma as any, repo as any);
    await service.aggregateForDate('p1', new Date('2025-03-01'));
    expect(repo.upsert).toHaveBeenCalledWith(
      'p1',
      expect.any(Date),
      expect.objectContaining({ steps: 8000 }),
    );
  });

  it('aggregates calories as sum', async () => {
    const prisma = makePrisma([
      makeRecord(OracleMetricType.CALORIES, 1200),
      makeRecord(OracleMetricType.CALORIES, 900),
    ]);
    const repo = makeRepo();
    const service = new DailyMetricsService(prisma as any, repo as any);
    await service.aggregateForDate('p1', new Date('2025-03-01'));
    expect(repo.upsert).toHaveBeenCalledWith(
      'p1',
      expect.any(Date),
      expect.objectContaining({ calories: 2100 }),
    );
  });

  it('aggregates avgHeartRate as average', async () => {
    const prisma = makePrisma([
      makeRecord(OracleMetricType.HEART_RATE, 60),
      makeRecord(OracleMetricType.HEART_RATE, 80),
    ]);
    const repo = makeRepo();
    const service = new DailyMetricsService(prisma as any, repo as any);
    await service.aggregateForDate('p1', new Date('2025-03-01'));
    expect(repo.upsert).toHaveBeenCalledWith(
      'p1',
      expect.any(Date),
      expect.objectContaining({ avgHeartRate: 70 }),
    );
  });

  it('uses latest value for weight', async () => {
    const ts1 = new Date('2025-03-01T08:00:00Z');
    const ts2 = new Date('2025-03-01T18:00:00Z');
    const prisma = makePrisma([
      makeRecord(OracleMetricType.WEIGHT, 75, ts1),
      makeRecord(OracleMetricType.WEIGHT, 74.8, ts2),
    ]);
    const repo = makeRepo();
    const service = new DailyMetricsService(prisma as any, repo as any);
    await service.aggregateForDate('p1', new Date('2025-03-01'));
    const call = (repo.upsert as jest.Mock).mock.calls[0];
    expect(call[2].weight).toBe(74.8);
  });

  it('omits undefined fields from upsert', async () => {
    const prisma = makePrisma([makeRecord(OracleMetricType.STEPS, 5000)]);
    const repo = makeRepo();
    const service = new DailyMetricsService(prisma as any, repo as any);
    await service.aggregateForDate('p1', new Date('2025-03-01'));
    const data = (repo.upsert as jest.Mock).mock.calls[0][2];
    expect(Object.values(data).every((v) => v !== undefined)).toBe(true);
  });

  it('handles empty normalizedData gracefully', async () => {
    const prisma = makePrisma([]);
    const repo = makeRepo();
    const service = new DailyMetricsService(prisma as any, repo as any);
    await service.aggregateForDate('p1', new Date('2025-03-01'));
    // syncCount should be 0
    const data = (repo.upsert as jest.Mock).mock.calls[0][2];
    expect(data.syncCount).toBe(0);
  });

  it('restingHr is computed from lowest 10th-percentile of HR', async () => {
    const hrValues = [55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
    const prisma = makePrisma(hrValues.map((v) => makeRecord(OracleMetricType.HEART_RATE, v)));
    const repo = makeRepo();
    const service = new DailyMetricsService(prisma as any, repo as any);
    await service.aggregateForDate('p1', new Date('2025-03-01'));
    const data = (repo.upsert as jest.Mock).mock.calls[0][2];
    // 10th percentile of 10 = 1 value = 55 bpm
    expect(data.restingHr).toBe(55);
  });
});
