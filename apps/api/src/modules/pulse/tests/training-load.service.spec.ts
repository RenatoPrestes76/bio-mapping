import { TrainingLoadService } from '../services/training-load.service';

describe('TrainingLoadService', () => {
  let service: TrainingLoadService;

  beforeEach(() => {
    service = new TrainingLoadService(null as any, null as any);
  });

  describe('classifyStatus', () => {
    it.each([
      [25, 'FRESH'],
      [10, 'OPTIMAL'],
      [0, 'OPTIMAL'],
      [-5, 'ACCUMULATED'],
      [-20, 'OVERREACHING'],
      [-35, 'OVERTRAINING'],
    ] as const)('tsb=%d → %s', (tsb, expected) => {
      expect(service.classifyStatus(tsb)).toBe(expected);
    });

    it('tsb=20 → OPTIMAL (boundary, FRESH requires > 20)', () => {
      expect(service.classifyStatus(20)).toBe('OPTIMAL');
    });

    it('tsb=-10 → ACCUMULATED (boundary)', () => {
      expect(service.classifyStatus(-10)).toBe('ACCUMULATED');
    });

    it('tsb=-30 → OVERREACHING (boundary)', () => {
      expect(service.classifyStatus(-30)).toBe('OVERREACHING');
    });

    it('tsb=-31 → OVERTRAINING', () => {
      expect(service.classifyStatus(-31)).toBe('OVERTRAINING');
    });
  });
});
