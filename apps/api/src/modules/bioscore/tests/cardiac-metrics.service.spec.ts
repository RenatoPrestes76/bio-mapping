import {
  calculateHrZones,
  classifyRestingHr,
  computeCardioMetrics,
  estimateMaxHr,
  estimateVo2MaxFromHr,
} from '@bio/bioscore-engine';

describe('Cardiac Calculator', () => {
  // ── Max HR ────────────────────────────────────────────────────────────────

  describe('estimateMaxHr (Tanaka)', () => {
    it.each([
      [20, 194],
      [30, 187],
      [40, 180],
      [50, 173],
      [60, 166],
    ])('age=%d → maxHr=%d', (age, expected) => {
      expect(estimateMaxHr(age)).toBe(expected);
    });
  });

  // ── HR Zones ─────────────────────────────────────────────────────────────

  describe('calculateHrZones', () => {
    it('maxHR=187 → zone1 is 50-60% of 187', () => {
      const zones = calculateHrZones(187);
      expect(zones.zone1.min).toBe(Math.round(187 * 0.5));
      expect(zones.zone1.max).toBe(Math.round(187 * 0.6));
    });

    it('returns 5 zones with increasing ranges', () => {
      const zones = calculateHrZones(190);
      expect(zones.zone1.max).toBeLessThanOrEqual(zones.zone2.min);
      expect(zones.zone2.max).toBeLessThanOrEqual(zones.zone3.min);
      expect(zones.zone3.max).toBeLessThanOrEqual(zones.zone4.min);
      expect(zones.zone4.max).toBeLessThanOrEqual(zones.zone5.min);
    });

    it('zone5.max equals maxHR', () => {
      expect(calculateHrZones(190).zone5.max).toBe(190);
    });
  });

  // ── Resting HR Classification ─────────────────────────────────────────────

  describe('classifyRestingHr', () => {
    it.each([
      [50, 'EXCELENTE'],
      [60, 'MUITO_BOM'],
      [67, 'BOM'],
      [72, 'REGULAR'],
      [80, 'RUIM'],
    ])('hr=%d → %s', (hr, expected) => {
      expect(classifyRestingHr(hr)).toBe(expected);
    });
  });

  // ── VO2 Max from HR ───────────────────────────────────────────────────────

  describe('estimateVo2MaxFromHr', () => {
    it('resting=60 max=190 → VO2max ≈ 47.5', () => {
      const v = estimateVo2MaxFromHr(60, 190);
      expect(v).toBeCloseTo(47.5, 0);
    });

    it('lower resting HR → higher VO2max', () => {
      const v1 = estimateVo2MaxFromHr(50, 190);
      const v2 = estimateVo2MaxFromHr(70, 190);
      expect(v1).toBeGreaterThan(v2);
    });
  });

  // ── computeCardioMetrics integration ─────────────────────────────────────

  describe('computeCardioMetrics', () => {
    it('returns zones and score for 30yo with resting HR 58', () => {
      const result = computeCardioMetrics({ ageYears: 30, restingHr: 58 });
      expect(result.maxHrEstimated).toBe(estimateMaxHr(30));
      expect(result.classification).toBe('MUITO_BOM');
      expect(result.vo2maxEstimated).toBeDefined();
      expect(result.score).toBeGreaterThan(70);
    });

    it('no resting HR → score defaults to 50', () => {
      const result = computeCardioMetrics({ ageYears: 30 });
      expect(result.score).toBe(50);
      expect(result.classification).toBeUndefined();
    });

    it('uses measured maxHR when provided', () => {
      const result = computeCardioMetrics({
        ageYears: 30,
        restingHr: 60,
        maxHrMeasured: 195,
      });
      expect(result.zones.zone5.max).toBe(195);
    });
  });
});
