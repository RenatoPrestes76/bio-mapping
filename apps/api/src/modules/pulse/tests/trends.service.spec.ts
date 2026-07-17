import { TrendsService } from '../services/trends.service';

function makeMetricsRepo(data: Array<Record<string, unknown>>) {
  return {
    findRange: jest.fn().mockResolvedValue(data),
    findByDate: jest.fn(),
    findLatest: jest.fn(),
    upsert: jest.fn(),
    findAllPatientsWithData: jest.fn(),
  };
}

function daily(date: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `d-${date}`,
    patientId: 'p1',
    date: new Date(date),
    steps: 8000,
    calories: 2200,
    sleepMinutes: 440,
    avgHeartRate: 70,
    hrv: 55,
    spo2: 97,
    weight: 75,
    bodyFat: 18,
    ...overrides,
  };
}

describe('TrendsService', () => {
  it('detects UP trend for steps', async () => {
    const repo = makeMetricsRepo([
      daily('2025-01-01', { steps: 5000 }),
      daily('2025-01-04', { steps: 7000 }),
      daily('2025-01-07', { steps: 9000 }),
    ]);
    const service = new TrendsService(repo as any);
    const trends = await service.computeTrends('p1', ['7d']);
    const stepsTrend = trends.find((t) => t.metric === 'steps' && t.period === '7d');
    expect(stepsTrend).toBeDefined();
    expect(stepsTrend!.direction).toBe('UP');
    expect(stepsTrend!.changePct).toBeGreaterThan(0);
  });

  it('detects DOWN trend for weight', async () => {
    const repo = makeMetricsRepo([
      daily('2025-01-01', { weight: 80 }),
      daily('2025-01-15', { weight: 78 }),
      daily('2025-01-30', { weight: 76 }),
    ]);
    const service = new TrendsService(repo as any);
    const trends = await service.computeTrends('p1', ['30d']);
    const weightTrend = trends.find((t) => t.metric === 'weight' && t.period === '30d');
    expect(weightTrend!.direction).toBe('DOWN');
    expect(weightTrend!.changePct).toBeLessThan(0);
  });

  it('detects STABLE trend (< 3% change)', async () => {
    const repo = makeMetricsRepo([
      daily('2025-01-01', { avgHeartRate: 70 }),
      daily('2025-01-04', { avgHeartRate: 71 }),
      daily('2025-01-07', { avgHeartRate: 70.5 }),
    ]);
    const service = new TrendsService(repo as any);
    const trends = await service.computeTrends('p1', ['7d']);
    const hrTrend = trends.find((t) => t.metric === 'avgHeartRate' && t.period === '7d');
    expect(hrTrend!.direction).toBe('STABLE');
  });

  it('returns empty array when < 2 data points', async () => {
    const repo = makeMetricsRepo([daily('2025-01-01')]);
    const service = new TrendsService(repo as any);
    const trends = await service.computeTrends('p1', ['7d']);
    expect(trends).toHaveLength(0);
  });

  it('returns empty array when no data', async () => {
    const repo = makeMetricsRepo([]);
    const service = new TrendsService(repo as any);
    const trends = await service.computeTrends('p1', ['7d']);
    expect(trends).toHaveLength(0);
  });

  it('computes average correctly', async () => {
    const repo = makeMetricsRepo([
      daily('2025-01-01', { steps: 6000 }),
      daily('2025-01-04', { steps: 8000 }),
      daily('2025-01-07', { steps: 10000 }),
    ]);
    const service = new TrendsService(repo as any);
    const trends = await service.computeTrends('p1', ['7d']);
    const st = trends.find((t) => t.metric === 'steps')!;
    expect(st.average).toBeCloseTo(8000, 0);
  });

  it('computeForMetric returns null when < 2 points', async () => {
    const repo = makeMetricsRepo([daily('2025-01-01')]);
    const service = new TrendsService(repo as any);
    const result = await service.computeForMetric('p1', 'steps', '7d');
    expect(result).toBeNull();
  });

  it('computeForMetric returns trend for a single metric', async () => {
    const repo = makeMetricsRepo([
      daily('2025-01-01', { weight: 80 }),
      daily('2025-01-07', { weight: 75 }),
    ]);
    const service = new TrendsService(repo as any);
    const result = await service.computeForMetric('p1', 'weight', '7d');
    expect(result).not.toBeNull();
    expect(result!.metric).toBe('weight');
    expect(result!.direction).toBe('DOWN');
  });
});
