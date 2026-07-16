import {
  calculateActivityScore,
  calculateConsistencyScore,
  calculateHealthScore,
} from '@bio/bioscore-engine';

describe('Health Score Calculator', () => {
  // ── Health Score ──────────────────────────────────────────────────────────

  describe('calculateHealthScore', () => {
    it('all components at 100 → HealthScore = 100', () => {
      const score = calculateHealthScore({
        cardioScore: 100,
        bodyScore: 100,
        sleepScore: 100,
        activityScore: 100,
        consistencyScore: 100,
      });
      expect(score).toBe(100);
    });

    it('all components at 0 → HealthScore = 0', () => {
      const score = calculateHealthScore({
        cardioScore: 0,
        bodyScore: 0,
        sleepScore: 0,
        activityScore: 0,
        consistencyScore: 0,
      });
      expect(score).toBe(0);
    });

    it('empty input → 0', () => {
      expect(calculateHealthScore({})).toBe(0);
    });

    it('partial input renormalizes weights', () => {
      const score = calculateHealthScore({ cardioScore: 80, bodyScore: 60 });
      // Only cardio (0.3) and body (0.25) weights apply, renormalized
      const expected = Math.round((80 * 0.3 + 60 * 0.25) / (0.3 + 0.25));
      expect(score).toBe(expected);
    });

    it('cardio has highest weight (30%)', () => {
      const high = calculateHealthScore({
        cardioScore: 100,
        bodyScore: 50,
        sleepScore: 50,
        activityScore: 50,
        consistencyScore: 50,
      });
      const baseline = calculateHealthScore({
        cardioScore: 50,
        bodyScore: 50,
        sleepScore: 50,
        activityScore: 50,
        consistencyScore: 50,
      });
      expect(high).toBeGreaterThan(baseline);
    });

    it('clamps inputs > 100 to 100', () => {
      const score = calculateHealthScore({ cardioScore: 150 });
      expect(score).toBe(100);
    });
  });

  // ── Activity Score ────────────────────────────────────────────────────────

  describe('calculateActivityScore', () => {
    it('5 sessions out of 5 target → 100', () => {
      expect(calculateActivityScore(5, 5)).toBe(100);
    });

    it('3 sessions out of 5 → 60', () => {
      expect(calculateActivityScore(3, 5)).toBe(60);
    });

    it('0 sessions → 0', () => {
      expect(calculateActivityScore(0)).toBe(0);
    });

    it('more than target → caps at 100', () => {
      expect(calculateActivityScore(10, 5)).toBe(100);
    });
  });

  // ── Consistency Score ─────────────────────────────────────────────────────

  describe('calculateConsistencyScore', () => {
    it('12+ consecutive weeks → 100', () => {
      expect(calculateConsistencyScore(12)).toBe(100);
      expect(calculateConsistencyScore(20)).toBe(100);
    });

    it('6 weeks → 50', () => {
      expect(calculateConsistencyScore(6)).toBe(50);
    });

    it('0 weeks → 0', () => {
      expect(calculateConsistencyScore(0)).toBe(0);
    });
  });
});
