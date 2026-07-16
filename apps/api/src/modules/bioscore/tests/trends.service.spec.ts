import {
  changePct,
  computeTrend,
  detectPlateau,
  getTrend,
  isPersonalRecordHigh,
  isPersonalRecordLow,
  linearRegression,
  movingAverage,
} from '@bio/bioscore-engine';

describe('Trends Calculator', () => {
  // ── Linear Regression ─────────────────────────────────────────────────────

  describe('linearRegression', () => {
    it('flat line → slope=0', () => {
      const { slope } = linearRegression([10, 10, 10, 10]);
      expect(slope).toBe(0);
    });

    it('perfect upward trend → slope=1', () => {
      const { slope } = linearRegression([0, 1, 2, 3, 4]);
      expect(slope).toBe(1);
    });

    it('perfect downward trend → slope=-1', () => {
      const { slope } = linearRegression([4, 3, 2, 1, 0]);
      expect(slope).toBe(-1);
    });

    it('single point → slope=0', () => {
      const { slope } = linearRegression([5]);
      expect(slope).toBe(0);
    });
  });

  // ── Moving Average ────────────────────────────────────────────────────────

  describe('movingAverage', () => {
    it('window=3, values=[1,2,3,4,5] → last MA=4', () => {
      const ma = movingAverage([1, 2, 3, 4, 5], 3);
      expect(ma[ma.length - 1]).toBe(4);
    });

    it('window > length → uses available values', () => {
      const ma = movingAverage([10, 20], 7);
      expect(ma[1]).toBe(15);
    });
  });

  // ── Trend Direction ───────────────────────────────────────────────────────

  describe('getTrend', () => {
    it.each([
      [0.5, 'IMPROVING'],
      [0, 'STABLE'],
      [-0.5, 'DECLINING'],
    ])('slope=%d → %s', (slope, expected) => {
      expect(getTrend(slope)).toBe(expected);
    });

    it('just below threshold → STABLE', () => {
      expect(getTrend(0.0005)).toBe('STABLE');
    });
  });

  // ── Plateau Detection ─────────────────────────────────────────────────────

  describe('detectPlateau', () => {
    it('flat 7 values → plateau detected', () => {
      expect(detectPlateau([70, 70, 70, 70, 70, 70, 70])).toBe(true);
    });

    it('clear upward trend → no plateau', () => {
      const values = [60, 62, 64, 66, 68, 70, 72, 74];
      expect(detectPlateau(values)).toBe(false);
    });

    it('not enough data → false', () => {
      expect(detectPlateau([70, 71], 7)).toBe(false);
    });
  });

  // ── Personal Records ──────────────────────────────────────────────────────

  describe('isPersonalRecordHigh', () => {
    it('new max → true', () => {
      expect(isPersonalRecordHigh(55, 50)).toBe(true);
    });

    it('not new max → false', () => {
      expect(isPersonalRecordHigh(48, 50)).toBe(false);
    });
  });

  describe('isPersonalRecordLow', () => {
    it('new min (faster pace) → true', () => {
      expect(isPersonalRecordLow(280, 300)).toBe(true);
    });

    it('not new min → false', () => {
      expect(isPersonalRecordLow(310, 300)).toBe(false);
    });
  });

  // ── Change Percentage ─────────────────────────────────────────────────────

  describe('changePct', () => {
    it('100 → 110 → +10%', () => {
      expect(changePct(100, 110)).toBe(10);
    });

    it('100 → 90 → -10%', () => {
      expect(changePct(100, 90)).toBe(-10);
    });

    it('start=0 → 0 (no division by zero)', () => {
      expect(changePct(0, 100)).toBe(0);
    });
  });

  // ── computeTrend integration ──────────────────────────────────────────────

  describe('computeTrend', () => {
    it('improving weight-loss series → IMPROVING (higherIsBetter=false)', () => {
      const weights = [85, 84.5, 84, 83.5, 83, 82.5, 82];
      const report = computeTrend(weights, false);
      expect(report.trend).toBe('IMPROVING');
      expect(report.changePct).toBeLessThan(0);
    });

    it('improving VO2max → IMPROVING (higherIsBetter=true)', () => {
      const vo2 = [42, 43, 44, 44.5, 45, 46, 47];
      const report = computeTrend(vo2, true);
      expect(report.trend).toBe('IMPROVING');
    });

    it('detects plateau in stagnant data', () => {
      const values = Array(10).fill(75);
      const report = computeTrend(values);
      expect(report.isPlateauDetected).toBe(true);
      expect(report.trend).toBe('STABLE');
    });
  });
});
