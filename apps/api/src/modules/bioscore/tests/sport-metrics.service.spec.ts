import {
  calculateLoadProgression,
  calculateSwolf,
  calculateWeeklyTonnage,
  computeCyclingMetrics,
  computeRunningMetrics,
  estimateFtp,
  estimateVo2MaxCooper,
  estimateVo2MaxVdot,
  formatPace,
} from '@bio/bioscore-engine';

describe('Sport Calculator', () => {
  // ── Running ───────────────────────────────────────────────────────────────

  describe('formatPace', () => {
    it('300 sec/km → "5:00 /km"', () => {
      expect(formatPace(300)).toBe('5:00 /km');
    });

    it('330 sec/km → "5:30 /km"', () => {
      expect(formatPace(330)).toBe('5:30 /km');
    });

    it('245 sec/km → "4:05 /km"', () => {
      expect(formatPace(245)).toBe('4:05 /km');
    });
  });

  describe('estimateVo2MaxCooper', () => {
    it('2800m in 12min → ~51.3 ml/kg/min', () => {
      // (2800 - 504.9) / 44.73 = 51.28 → rounded to 51.3
      const v = estimateVo2MaxCooper(2800);
      expect(v).toBeCloseTo(51.3, 0);
    });

    it('higher distance → higher VO2max', () => {
      expect(estimateVo2MaxCooper(3000)).toBeGreaterThan(estimateVo2MaxCooper(2500));
    });
  });

  describe('estimateVo2MaxVdot', () => {
    it('5K in 20min (4:00/km) → VO2max ≈ 42-46', () => {
      // VDOT formula: vo2AtPace/fractionVo2 ≈ 47.5/1.12 ≈ 42.5
      const v = estimateVo2MaxVdot(5000, 1200);
      expect(v).toBeGreaterThan(38);
      expect(v).toBeLessThan(50);
    });

    it('faster pace → higher VO2max', () => {
      const fast = estimateVo2MaxVdot(5000, 1050); // 17:30
      const slow = estimateVo2MaxVdot(5000, 1500); // 25:00
      expect(fast).toBeGreaterThan(slow);
    });
  });

  describe('computeRunningMetrics', () => {
    it('picks best race for VO2max estimation', () => {
      const result = computeRunningMetrics({
        recentRaces: [
          { distanceM: 5000, timeSeconds: 1200 }, // faster
          { distanceM: 5000, timeSeconds: 1500 }, // slower
        ],
      });
      expect(result.vo2maxEstimated).toBeDefined();
    });

    it('weekly distance → load points in km', () => {
      const result = computeRunningMetrics({ weeklyDistanceM: 40000 });
      expect(result.weeklyLoadPoints).toBe(40);
    });
  });

  // ── Cycling ───────────────────────────────────────────────────────────────

  describe('estimateFtp', () => {
    it('300W for 20min → FTP=285W', () => {
      expect(estimateFtp(300)).toBe(285);
    });
  });

  describe('computeCyclingMetrics', () => {
    it('returns FTP from 20min power', () => {
      const result = computeCyclingMetrics({ power20MinWatts: 250 });
      expect(result.estimatedFtpWatts).toBe(estimateFtp(250));
    });
  });

  // ── Swimming ──────────────────────────────────────────────────────────────

  describe('calculateSwolf', () => {
    it('20 strokes + 40 seconds → SWOLF=60', () => {
      expect(calculateSwolf(20, 40)).toBe(60);
    });
  });

  // ── Strength ──────────────────────────────────────────────────────────────

  describe('calculateWeeklyTonnage', () => {
    it('3×10×100kg → 3000kg', () => {
      const sets = Array(3).fill({ reps: 10, weightKg: 100 });
      expect(calculateWeeklyTonnage(sets)).toBe(3000);
    });

    it('empty → 0', () => {
      expect(calculateWeeklyTonnage([])).toBe(0);
    });
  });

  describe('calculateLoadProgression', () => {
    it('3000 → 3300 → +10%', () => {
      expect(calculateLoadProgression(3300, 3000)).toBe(10);
    });

    it('previousTonnage=0 → 0', () => {
      expect(calculateLoadProgression(1000, 0)).toBe(0);
    });

    it('regression → negative', () => {
      expect(calculateLoadProgression(2700, 3000)).toBeLessThan(0);
    });
  });
});
