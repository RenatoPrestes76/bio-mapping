import { NotFoundException } from '@nestjs/common';
import { BioBookService } from '../bio-book.service.js';
import { BioBookProvider } from '../providers/bio-book.provider.js';
import { HealthNarrative } from '../entities/health-narrative.entity.js';
import { NarrativeChapter } from '../entities/narrative-chapter.entity.js';
import { NarrativeEvent } from '../entities/narrative-event.entity.js';

const BASE_DATE = new Date('2024-03-01T00:00:00Z');

function makeNarrative(patientId: string): HealthNarrative {
  const event = new NarrativeEvent({
    patientId, eventType: 'LAB_RESULT', date: BASE_DATE, narrativeText: 'Teste',
  });
  const chapter = new NarrativeChapter({ number: 1, theme: 'INITIAL_BASELINE', startDate: BASE_DATE, endDate: BASE_DATE });
  return new HealthNarrative({
    patientId, chapters: [chapter], milestones: [], events: [event],
    summary: { headline: 'H', overview: 'O', keyAchievements: [], currentStatus: 'OK', nextSteps: [], positiveCount: 1, concernCount: 0, totalChapters: 1, totalMilestones: 0, journeyDurationDays: 0 },
  });
}

describe('BioBookService', () => {
  let service: BioBookService;
  let provider: jest.Mocked<BioBookProvider>;

  beforeEach(() => {
    provider = {
      generate: jest.fn(),
      findByPatient: jest.fn(),
      listAll: jest.fn(),
      clear: jest.fn(),
    } as unknown as jest.Mocked<BioBookProvider>;
    service = new BioBookService(provider);
  });

  describe('generate', () => {
    it('delegates to provider and returns HealthNarrative', () => {
      const narrative = makeNarrative('p1');
      provider.generate.mockReturnValue(narrative);
      const dto = { patientId: 'p1', events: [] };
      const result = service.generate(dto);
      expect(provider.generate).toHaveBeenCalledWith(dto);
      expect(result).toBe(narrative);
    });
  });

  describe('getNarrative', () => {
    it('returns narrative when found', () => {
      const narrative = makeNarrative('p1');
      provider.findByPatient.mockReturnValue(narrative);
      expect(service.getNarrative('p1')).toBe(narrative);
    });

    it('throws NotFoundException when not found', () => {
      provider.findByPatient.mockReturnValue(undefined);
      expect(() => service.getNarrative('unknown')).toThrow(NotFoundException);
    });
  });

  describe('getTimeline', () => {
    it('delegates to getNarrative', () => {
      const narrative = makeNarrative('p1');
      provider.findByPatient.mockReturnValue(narrative);
      expect(service.getTimeline('p1')).toBe(narrative);
    });

    it('throws when narrative not found', () => {
      provider.findByPatient.mockReturnValue(undefined);
      expect(() => service.getTimeline('missing')).toThrow(NotFoundException);
    });
  });

  describe('getChapters', () => {
    it('delegates to getNarrative', () => {
      const narrative = makeNarrative('p1');
      provider.findByPatient.mockReturnValue(narrative);
      expect(service.getChapters('p1')).toBe(narrative);
    });

    it('throws when narrative not found', () => {
      provider.findByPatient.mockReturnValue(undefined);
      expect(() => service.getChapters('missing')).toThrow(NotFoundException);
    });
  });

  describe('getSummary', () => {
    it('delegates to getNarrative', () => {
      const narrative = makeNarrative('p1');
      provider.findByPatient.mockReturnValue(narrative);
      expect(service.getSummary('p1')).toBe(narrative);
    });

    it('throws when narrative not found', () => {
      provider.findByPatient.mockReturnValue(undefined);
      expect(() => service.getSummary('missing')).toThrow(NotFoundException);
    });
  });

  describe('BioBookProvider (integration)', () => {
    it('stores and retrieves a generated narrative', () => {
      const realProvider = new BioBookProvider();
      const realService = new BioBookService(realProvider);
      const dto = {
        patientId: 'p-integration',
        events: [
          { eventType: 'LAB_RESULT', date: '2024-03-01T00:00:00Z', severity: 'MILD', biomarkers: { glucose: 95 } },
          { eventType: 'CONSULTATION', date: '2024-06-01T00:00:00Z', severity: 'INFORMATIONAL' },
        ],
      };
      const narrative = realService.generate(dto);
      expect(narrative).toBeInstanceOf(HealthNarrative);
      expect(narrative.patientId).toBe('p-integration');
      expect(narrative.events.length).toBe(2);

      const retrieved = realService.getNarrative('p-integration');
      expect(retrieved.id).toBe(narrative.id);
    });

    it('throws NotFoundException for unknown patient in real provider', () => {
      const realProvider = new BioBookProvider();
      const realService = new BioBookService(realProvider);
      expect(() => realService.getNarrative('no-such-patient')).toThrow(NotFoundException);
    });
  });
});
