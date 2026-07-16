import {
  calculateSleepDebt,
  calculateSleepEfficiency,
  classifySleep,
  computeSleepMetrics,
} from '@bio/bioscore-engine';

describe('Sleep Calculator', () => {
  // ── Efficiency ────────────────────────────────────────────────────────────

  describe('calculateSleepEfficiency', () => {
    it('420min sleep / 480min in bed → 87.5%', () => {
      expect(calculateSleepEfficiency(420, 480)).toBe(87.5);
    });

    it('time in bed = 0 → 0', () => {
      expect(calculateSleepEfficiency(0, 0)).toBe(0);
    });

    it('clamps to 100', () => {
      expect(calculateSleepEfficiency(500, 480)).toBe(100);
    });
  });

  // ── Sleep Debt ────────────────────────────────────────────────────────────

  describe('calculateSleepDebt', () => {
    it('7 nights of 6h → debt=420min (7 nights × 2h)', () => {
      const nights = Array(7).fill(360);
      expect(calculateSleepDebt(nights)).toBe(7 * 120);
    });

    it('7 nights of 8h → no debt', () => {
      const nights = Array(7).fill(480);
      expect(calculateSleepDebt(nights)).toBe(0);
    });

    it('custom target: 7h target, 6h actual → 60min debt', () => {
      expect(calculateSleepDebt([360], 420)).toBe(60);
    });
  });

  // ── Classification ────────────────────────────────────────────────────────

  describe('classifySleep', () => {
    it.each([
      [92, 430, 'EXCELENTE'],
      [86, 400, 'BOA'],
      [76, 370, 'REGULAR'],
      [70, 340, 'RUIM'],
      [90, 360, 'REGULAR'],  // good efficiency but < 6.5h → REGULAR
    ])('efficiency=%d% total=%dmin → %s', (eff, min, expected) => {
      expect(classifySleep(eff, min)).toBe(expected);
    });
  });

  // ── computeSleepMetrics integration ──────────────────────────────────────

  describe('computeSleepMetrics', () => {
    it('computes from totalMinutes + awakeMinutes', () => {
      const result = computeSleepMetrics({
        totalMinutes: 430,
        awakeMinutes: 20,
        recentNightsMinutes: Array(7).fill(430),
      });
      expect(result.efficiency).toBeGreaterThan(90);
      expect(result.classification).toBe('EXCELENTE');
      // 7 nights × (480-430) = 350 min deficit
      expect(result.sleepDebtMin).toBe(350);
      expect(result.score).toBe(100);
    });

    it('computes from bedtime/wakeTime dates', () => {
      const bedtime = new Date('2025-07-10T23:00:00Z');
      const wakeTime = new Date('2025-07-11T07:00:00Z'); // 8h in bed
      const result = computeSleepMetrics({ bedtime, wakeTime, awakeMinutes: 30 });
      expect(result.efficiency).toBeLessThan(95);
      expect(result.classification).toBeDefined();
    });

    it('no data → score=50', () => {
      const result = computeSleepMetrics({});
      expect(result.score).toBe(50);
    });
  });
});
