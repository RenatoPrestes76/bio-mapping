import { interpretTrend } from '../insights/trend-insight.js';

describe('interpretTrend', () => {
  it('returns IMPROVING with positive magnitude for a rising series', () => {
    const insight = interpretTrend([60, 65, 70]);
    expect(insight.direction).toBe('IMPROVING');
    expect(insight.magnitude).toBeGreaterThan(0);
    expect(insight.dataPoints).toBe(3);
  });

  it('returns DECLINING with negative magnitude for a falling series', () => {
    const insight = interpretTrend([70, 65, 60]);
    expect(insight.direction).toBe('DECLINING');
    expect(insight.magnitude).toBeLessThan(0);
  });

  it('returns STABLE for a flat series', () => {
    const insight = interpretTrend([50, 50, 50]);
    expect(insight.direction).toBe('STABLE');
  });

  it('returns INSUFFICIENT_DATA with null magnitude for fewer than 2 points', () => {
    const insight = interpretTrend([50]);
    expect(insight.direction).toBe('INSUFFICIENT_DATA');
    expect(insight.magnitude).toBeNull();
    expect(insight.confidence).toBe('LOW');
    expect(insight.explanation).toContain(
      'não há dados históricos suficientes',
    );
  });

  it('returns INSUFFICIENT_DATA for an empty series', () => {
    const insight = interpretTrend([]);
    expect(insight.direction).toBe('INSUFFICIENT_DATA');
    expect(insight.dataPoints).toBe(0);
  });

  it('confidence is HIGH with 3+ points, MODERATE with exactly 2', () => {
    expect(interpretTrend([60, 65, 70]).confidence).toBe('HIGH');
    expect(interpretTrend([60, 65]).confidence).toBe('MODERATE');
  });

  it('always includes the regression-limitation note', () => {
    const insight = interpretTrend([60, 65, 70]);
    expect(
      insight.limitations.some((l) => l.includes('regressão linear')),
    ).toBe(true);
  });

  it('flags few-data-points limitation when below the high-confidence threshold', () => {
    const insight = interpretTrend([60, 65]);
    expect(insight.limitations.some((l) => l.includes('Poucos pontos'))).toBe(
      true,
    );
  });

  it('explanation never asserts a direction the data does not support (STABLE case)', () => {
    const insight = interpretTrend([50, 50, 50]);
    expect(insight.explanation.toLowerCase()).not.toContain('positiva');
    expect(insight.explanation.toLowerCase()).not.toContain('queda');
  });

  it('is a pure function — independent calls never mix series', () => {
    const rising = interpretTrend([10, 20, 30]);
    const falling = interpretTrend([30, 20, 10]);
    expect(rising.direction).toBe('IMPROVING');
    expect(falling.direction).toBe('DECLINING');
    // re-run in reverse order to confirm no shared/mutated state between calls
    const fallingAgain = interpretTrend([30, 20, 10]);
    const risingAgain = interpretTrend([10, 20, 30]);
    expect(fallingAgain.direction).toBe('DECLINING');
    expect(risingAgain.direction).toBe('IMPROVING');
  });

  it('respects higherIsBetter=false (e.g. weight-loss-style metrics)', () => {
    const insight = interpretTrend([80, 75, 70], { higherIsBetter: false });
    expect(insight.direction).toBe('IMPROVING');
  });
});
