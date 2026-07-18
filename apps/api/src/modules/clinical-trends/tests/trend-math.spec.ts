import { linearRegression, toRegressionPoints } from '../analyzers/trend-math.js';

describe('linearRegression', () => {
  it('computes correct slope for a perfect increasing series', () => {
    const points = [
      { x: 0, y: 100 }, { x: 1, y: 102 }, { x: 2, y: 104 }, { x: 3, y: 106 },
    ];
    const { slope, r2 } = linearRegression(points);
    expect(Math.round(slope)).toBe(2);
    expect(r2).toBeCloseTo(1, 5);
  });

  it('computes correct slope for a perfect decreasing series', () => {
    const points = [
      { x: 0, y: 200 }, { x: 1, y: 195 }, { x: 2, y: 190 }, { x: 3, y: 185 },
    ];
    const { slope, r2 } = linearRegression(points);
    expect(Math.round(slope)).toBe(-5);
    expect(r2).toBeCloseTo(1, 5);
  });

  it('returns slope=0 and r2=1 for a constant series', () => {
    const points = [{ x: 0, y: 100 }, { x: 1, y: 100 }, { x: 2, y: 100 }];
    const { slope, r2 } = linearRegression(points);
    expect(slope).toBe(0);
    expect(r2).toBe(1);
  });

  it('returns r2 < 1 for a noisy series', () => {
    const points = [
      { x: 0, y: 100 }, { x: 1, y: 115 }, { x: 2, y: 98 }, { x: 3, y: 120 },
    ];
    const { r2 } = linearRegression(points);
    expect(r2).toBeGreaterThanOrEqual(0);
    expect(r2).toBeLessThan(1);
  });

  it('handles two points (minimum required)', () => {
    const points = [{ x: 0, y: 50 }, { x: 10, y: 70 }];
    const { slope } = linearRegression(points);
    expect(slope).toBeCloseTo(2, 5);
  });

  it('computes intercept correctly', () => {
    const points = [{ x: 0, y: 5 }, { x: 1, y: 7 }, { x: 2, y: 9 }];
    const { slope, intercept } = linearRegression(points);
    expect(slope).toBeCloseTo(2, 5);
    expect(intercept).toBeCloseTo(5, 5);
  });
});

describe('toRegressionPoints', () => {
  it('normalizes timestamps to days since first point', () => {
    const base = new Date('2024-01-01T00:00:00Z');
    const points = [
      { value: 100, timestamp: base },
      { value: 105, timestamp: new Date(base.getTime() + 7 * 86_400_000) },
    ];
    const result = toRegressionPoints(points);
    expect(result[0].x).toBe(0);
    expect(result[1].x).toBeCloseTo(7, 5);
    expect(result[0].y).toBe(100);
    expect(result[1].y).toBe(105);
  });
});
