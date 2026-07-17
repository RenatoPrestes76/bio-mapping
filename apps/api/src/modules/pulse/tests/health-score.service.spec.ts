import { PulseHealthScoreService } from '../services/health-score.service';

describe('PulseHealthScoreService', () => {
  let service: PulseHealthScoreService;

  beforeEach(() => {
    service = new PulseHealthScoreService(null as any, null as any);
  });

  describe('computeComponents', () => {
    it('full data — healthy adult → overall > 70', () => {
      const result = service.computeComponents({
        sleepMinutes: 480,
        steps: 10_000,
        calories: 2600,
        restingHr: 60,
        hrv: 55,
      });
      expect(result.overall).toBeGreaterThan(70);
    });

    it('no data → overall = 50 (all defaults)', () => {
      const result = service.computeComponents({});
      expect(result.overall).toBe(50);
    });

    it('sleep: 8h → sleepScore=100', () => {
      const { sleepScore } = service.computeComponents({ sleepMinutes: 480 });
      expect(sleepScore).toBe(100);
    });

    it('sleep: 7h → sleepScore=85', () => {
      const { sleepScore } = service.computeComponents({ sleepMinutes: 420 });
      expect(sleepScore).toBe(85);
    });

    it('sleep: 6h → sleepScore=65', () => {
      const { sleepScore } = service.computeComponents({ sleepMinutes: 360 });
      expect(sleepScore).toBe(65);
    });

    it('sleep: 5h → sleepScore=45', () => {
      const { sleepScore } = service.computeComponents({ sleepMinutes: 300 });
      expect(sleepScore).toBe(45);
    });

    it('sleep: 4h → sleepScore=25', () => {
      const { sleepScore } = service.computeComponents({ sleepMinutes: 240 });
      expect(sleepScore).toBe(25);
    });

    it('steps: 10000 → stepsScore=100', () => {
      const { stepsScore } = service.computeComponents({ steps: 10_000 });
      expect(stepsScore).toBe(100);
    });

    it('steps: 5000 → stepsScore=50', () => {
      const { stepsScore } = service.computeComponents({ steps: 5_000 });
      expect(stepsScore).toBe(50);
    });

    it('steps: 15000 → stepsScore capped at 100', () => {
      const { stepsScore } = service.computeComponents({ steps: 15_000 });
      expect(stepsScore).toBe(100);
    });

    it('calories: no active calories (2000 total) → exerciseScore=0', () => {
      const { exerciseScore } = service.computeComponents({ calories: 2000 });
      expect(exerciseScore).toBe(0);
    });

    it('calories: 2500 total (500 active) → exerciseScore=100', () => {
      const { exerciseScore } = service.computeComponents({ calories: 2500 });
      expect(exerciseScore).toBe(100);
    });

    it('resting HR < 55 → hrScore=100', () => {
      const { hrScore } = service.computeComponents({ restingHr: 48 });
      expect(hrScore).toBe(100);
    });

    it('resting HR 65-75 → hrScore=70', () => {
      const { hrScore } = service.computeComponents({ restingHr: 70 });
      expect(hrScore).toBe(70);
    });

    it('resting HR 100+ → hrScore=25', () => {
      const { hrScore } = service.computeComponents({ restingHr: 110 });
      expect(hrScore).toBe(25);
    });

    it('hydration always 50 (not yet tracked)', () => {
      const { hydrationScore } = service.computeComponents({ steps: 10_000 });
      expect(hydrationScore).toBe(50);
    });

    it('overall is within 0–100', () => {
      for (const input of [
        { sleepMinutes: 600, steps: 20000, calories: 3000, restingHr: 40 },
        { sleepMinutes: 0, steps: 0, calories: 0, restingHr: 200 },
      ]) {
        const { overall } = service.computeComponents(input);
        expect(overall).toBeGreaterThanOrEqual(0);
        expect(overall).toBeLessThanOrEqual(100);
      }
    });
  });
});
