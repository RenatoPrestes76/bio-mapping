import {
  checkElevatedHr,
  checkInsufficientRecovery,
  checkOvertraining,
  checkPerformanceDrop,
  checkProlongedSedentarism,
  checkRapidWeightGain,
  checkSleepDeficit,
} from '@bio/bioscore-engine';

describe('Alert Calculator', () => {
  // ── Elevated HR ───────────────────────────────────────────────────────────

  describe('checkElevatedHr', () => {
    it('returns alert when last 3 readings exceed baseline+1SD', () => {
      // Baseline avg≈60, SD≈5 → threshold≈65; last 3 are 75
      const values = [58, 60, 62, 59, 61, 60, 75, 76, 77];
      const alert = checkElevatedHr(values, 3, 1);
      expect(alert).not.toBeNull();
      expect(alert!.type).toBe('ELEVATED_HEART_RATE');
      expect(alert!.severity).toBe('WARNING');
    });

    it('returns null when last readings are within normal range', () => {
      // baseline avg≈69.7, SD≈3.2, threshold≈72.9; last 3 [70,69,68] all below → null
      const values = [65, 72, 68, 75, 70, 68, 70, 69, 68];
      expect(checkElevatedHr(values)).toBeNull();
    });

    it('returns null when not enough data', () => {
      expect(checkElevatedHr([60, 65])).toBeNull();
    });
  });

  // ── Performance Drop ──────────────────────────────────────────────────────

  describe('checkPerformanceDrop', () => {
    it('detects >10% drop in VO2max (higher is better)', () => {
      const alert = checkPerformanceDrop('VO2max', 40, 50, 0.1, true);
      expect(alert).not.toBeNull();
      expect(alert!.type).toBe('PERFORMANCE_DROP');
    });

    it('no alert if drop is below threshold', () => {
      expect(checkPerformanceDrop('VO2max', 48, 50, 0.1, true)).toBeNull();
    });

    it('detects >10% regression in pace (lower is better)', () => {
      // Pace went from 300s/km (good) to 340s/km (slower) = +13% → alert
      const alert = checkPerformanceDrop('pace', 340, 300, 0.1, false);
      expect(alert).not.toBeNull();
    });
  });

  // ── Insufficient Recovery ─────────────────────────────────────────────────

  describe('checkInsufficientRecovery', () => {
    it('2 days below threshold → alert', () => {
      const alert = checkInsufficientRecovery([80, 75, 35, 38], 2, 40);
      expect(alert).not.toBeNull();
      expect(alert!.type).toBe('INSUFFICIENT_RECOVERY');
    });

    it('only 1 day below threshold → no alert', () => {
      const alert = checkInsufficientRecovery([80, 75, 35, 75], 2, 40);
      expect(alert).toBeNull();
    });
  });

  // ── Rapid Weight Gain ─────────────────────────────────────────────────────

  describe('checkRapidWeightGain', () => {
    it('gain of 2.5kg in 7 days → alert', () => {
      const weights = [70, 70.5, 71, 71.5, 72, 72.3, 72.5];
      const alert = checkRapidWeightGain(weights, 7, 2.0);
      expect(alert).not.toBeNull();
      expect(alert!.type).toBe('RAPID_WEIGHT_GAIN');
    });

    it('gain of 1kg → no alert', () => {
      const weights = [70, 70.2, 70.5, 70.7, 70.8, 70.9, 71];
      expect(checkRapidWeightGain(weights, 7, 2.0)).toBeNull();
    });
  });

  // ── Prolonged Sedentarism ─────────────────────────────────────────────────

  describe('checkProlongedSedentarism', () => {
    it('7 days inactive → alert', () => {
      const alert = checkProlongedSedentarism(Array(7).fill(0));
      expect(alert).not.toBeNull();
      expect(alert!.type).toBe('PROLONGED_SEDENTARISM');
    });

    it('1 active day in 7 → no alert', () => {
      const days = [0, 0, 0, 1, 0, 0, 0];
      expect(checkProlongedSedentarism(days)).toBeNull();
    });
  });

  // ── Sleep Deficit ─────────────────────────────────────────────────────────

  describe('checkSleepDeficit', () => {
    it('7 nights of 6.5h → deficit=10.5h → alert', () => {
      const sleepHours = Array(7).fill(6.5);
      const alert = checkSleepDeficit(sleepHours, 7, 8, 5);
      expect(alert).not.toBeNull();
      expect(alert!.type).toBe('SLEEP_DEFICIT');
    });

    it('7 nights of 8h → no deficit', () => {
      const sleepHours = Array(7).fill(8);
      expect(checkSleepDeficit(sleepHours, 7, 8, 5)).toBeNull();
    });

    it('not enough history → null', () => {
      expect(checkSleepDeficit([6, 6], 7, 8, 5)).toBeNull();
    });
  });

  // ── Overtraining ──────────────────────────────────────────────────────────

  describe('checkOvertraining', () => {
    it('ATL 1.6× CTL → overtraining alert', () => {
      const alert = checkOvertraining(160, 100, 1.5);
      expect(alert).not.toBeNull();
      expect(alert!.type).toBe('OVERTRAINING');
      expect(alert!.severity).toBe('CRITICAL');
    });

    it('ATL = CTL → no alert', () => {
      expect(checkOvertraining(100, 100, 1.5)).toBeNull();
    });

    it('CTL = 0 → null (no division by zero)', () => {
      expect(checkOvertraining(100, 0, 1.5)).toBeNull();
    });
  });
});
