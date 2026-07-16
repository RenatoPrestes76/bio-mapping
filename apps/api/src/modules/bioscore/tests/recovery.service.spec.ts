import {
  calculateAtl,
  calculateCtl,
  computeRecoveryScore,
  getRecoveryRecommendation,
} from '@bio/bioscore-engine';

describe('Recovery Calculator', () => {
  // ── ATL / CTL ─────────────────────────────────────────────────────────────

  describe('calculateAtl', () => {
    it('converges towards steady load', () => {
      const loads = Array(20).fill(100);
      const atl = calculateAtl(loads);
      expect(atl).toBeGreaterThan(50);
    });

    it('no loads → 0', () => {
      expect(calculateAtl([])).toBe(0);
    });
  });

  describe('calculateCtl', () => {
    it('CTL (lambda=28) converges slower than ATL (lambda=7) for same loads', () => {
      const loads = Array(28).fill(100);
      const atl = calculateAtl(loads);
      const ctl = calculateCtl(loads);
      // With constant load=100: ATL≈99, CTL≈64 (slower convergence)
      expect(atl).toBeGreaterThan(ctl);
      expect(ctl).toBeGreaterThan(0);
    });
  });

  // ── Recommendation ────────────────────────────────────────────────────────

  describe('getRecoveryRecommendation', () => {
    it.each([
      [85, 'INTENSO'],
      [65, 'MODERADO'],
      [45, 'LEVE'],
      [30, 'DESCANSO'],
    ])('score=%d → %s', (score, expected) => {
      expect(getRecoveryRecommendation(score)).toBe(expected);
    });
  });

  // ── computeRecoveryScore integration ────────────────────────────────────

  describe('computeRecoveryScore', () => {
    it('excellent sleep + normal HR → high score', () => {
      const result = computeRecoveryScore({
        sleepEfficiency: 92,
        sleepHours: 8,
        restingHr: 55,
        restingHrBaseline: 60,
      });
      expect(result.recoveryScore).toBeGreaterThan(70);
    });

    it('poor sleep + elevated HR → reduced score (< 70)', () => {
      // sleep=(60×0.6 + 62.5×0.4)=61; hr=(60/85×100)=71
      // weighted avg (0.3 + 0.2) renorm → 65 — clearly below well-rested 80+
      const result = computeRecoveryScore({
        sleepEfficiency: 60,
        sleepHours: 5,
        restingHr: 85,
        restingHrBaseline: 60,
      });
      expect(result.recoveryScore).toBeLessThan(70);
    });

    it('no input → neutral score of 50', () => {
      const result = computeRecoveryScore({});
      expect(result.recoveryScore).toBe(50);
      expect(result.recommendation).toBe('LEVE');
    });

    it('high ATL relative to CTL → overtraining risk → lower score', () => {
      const result = computeRecoveryScore({
        acuteLoad: 120,
        chronicLoad: 70,
      });
      expect(result.trainingStressBalance).toBeLessThan(0);
    });

    it('fresh TSB (CTL > ATL) → higher score', () => {
      const result = computeRecoveryScore({
        acuteLoad: 40,
        chronicLoad: 80,
      });
      expect(result.trainingLoadScore).toBeGreaterThan(50);
    });

    it('returns recommendation matching score', () => {
      const result = computeRecoveryScore({
        sleepEfficiency: 95,
        sleepHours: 8.5,
        hrv: 70,
        hrvBaseline: 60,
      });
      const expectedRec = getRecoveryRecommendation(result.recoveryScore);
      expect(result.recommendation).toBe(expectedRec);
    });
  });
});
