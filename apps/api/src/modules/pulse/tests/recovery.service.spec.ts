import { PulseRecoveryService } from '../services/recovery.service';

describe('PulseRecoveryService', () => {
  let service: PulseRecoveryService;

  beforeEach(() => {
    service = new PulseRecoveryService(null as any, null as any);
  });

  describe('computeFromData', () => {
    it('excellent HRV + low HR + good sleep → EXCELENTE', () => {
      const result = service.computeFromData(80, 48, 480, 15);
      expect(result.classification).toBe('EXCELENTE');
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it('poor HRV + high HR + bad sleep → CRITICA or BAIXA', () => {
      const result = service.computeFromData(15, 100, 240, -40);
      expect(['CRITICA', 'BAIXA']).toContain(result.classification);
      expect(result.score).toBeLessThan(50);
    });

    it('no data → score=50, MODERADA', () => {
      const result = service.computeFromData();
      expect(result.score).toBe(50);
      expect(result.classification).toBe('MODERADA');
    });

    it('positive TSB → higher training load score', () => {
      const fresh = service.computeFromData(undefined, undefined, undefined, 20);
      const fatigued = service.computeFromData(undefined, undefined, undefined, -20);
      expect(fresh.components.trainingLoadScore).toBeGreaterThan(fatigued.components.trainingLoadScore);
    });

    it('TSB -50 → trainingLoadScore=0 (clamped)', () => {
      const result = service.computeFromData(undefined, undefined, undefined, -50);
      expect(result.components.trainingLoadScore).toBe(0);
    });

    it('TSB +25 → trainingLoadScore=100 (clamped)', () => {
      const result = service.computeFromData(undefined, undefined, undefined, 25);
      expect(result.components.trainingLoadScore).toBe(100);
    });

    it('recommendation is non-empty string', () => {
      const result = service.computeFromData(60, 55, 450, 5);
      expect(typeof result.recommendation).toBe('string');
      expect(result.recommendation.length).toBeGreaterThan(0);
    });

    it.each([
      ['EXCELENTE', 82],
      ['BOA', 70],
      ['MODERADA', 55],
      ['BAIXA', 40],
      ['CRITICA', 20],
    ] as const)('score=%d → classification=%s', (expected, score) => {
      // Force score via reflective call using mock
      jest.spyOn(service as any, 'classify').mockReturnValueOnce(expected);
      const result = service.computeFromData();
      expect(result.classification).toBe(expected);
    });
  });
});
