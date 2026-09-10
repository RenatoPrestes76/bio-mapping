import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BioBookService } from '../bio-book.service.js';
import { BioBookProvider } from '../providers/bio-book.provider.js';
import { HealthNarrative } from '../entities/health-narrative.entity.js';
import { NarrativeChapter } from '../entities/narrative-chapter.entity.js';
import { NarrativeEvent } from '../entities/narrative-event.entity.js';
import type { JwtPayload } from '../../identity/auth/types/jwt-payload.interface.js';

const BASE_DATE = new Date('2024-03-01T00:00:00Z');

const owner: JwtPayload = { sub: 'p1', email: 'p1@example.com', role: 'PATIENT' };
const otherPatient: JwtPayload = { sub: 'p2', email: 'p2@example.com', role: 'PATIENT' };
const admin: JwtPayload = { sub: 'admin-1', email: 'admin@example.com', role: 'ADMIN' };

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
    it('delegates to provider using the authenticated user as patientId, ignoring any client-supplied patientId', () => {
      const narrative = makeNarrative('p1');
      provider.generate.mockReturnValue(narrative);
      const dto = { patientId: 'someone-else', events: [] };
      const result = service.generate(dto, owner);
      expect(provider.generate).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'p1' }));
      expect(result).toBe(narrative);
    });
  });

  describe('getNarrative', () => {
    it('returns narrative when found and actor is the owner', () => {
      const narrative = makeNarrative('p1');
      provider.findByPatient.mockReturnValue(narrative);
      expect(service.getNarrative('p1', owner)).toBe(narrative);
    });

    it('returns narrative to an admin regardless of ownership', () => {
      const narrative = makeNarrative('p1');
      provider.findByPatient.mockReturnValue(narrative);
      expect(service.getNarrative('p1', admin)).toBe(narrative);
    });

    it('throws NotFoundException when not found for its own (non-existent) record', () => {
      provider.findByPatient.mockReturnValue(undefined);
      const selfOwner: JwtPayload = { sub: 'unknown', email: 'x@example.com', role: 'PATIENT' };
      expect(() => service.getNarrative('unknown', selfOwner)).toThrow(NotFoundException);
    });

    it('SECURITY (IDOR): throws ForbiddenException when a different patient requests it', () => {
      provider.findByPatient.mockReturnValue(makeNarrative('p1'));
      expect(() => service.getNarrative('p1', otherPatient)).toThrow(ForbiddenException);
    });
  });

  describe('getTimeline / getChapters / getSummary', () => {
    it('delegate to getNarrative for the owner', () => {
      const narrative = makeNarrative('p1');
      provider.findByPatient.mockReturnValue(narrative);
      expect(service.getTimeline('p1', owner)).toBe(narrative);
      expect(service.getChapters('p1', owner)).toBe(narrative);
      expect(service.getSummary('p1', owner)).toBe(narrative);
    });

    it('SECURITY (IDOR): all three reject a non-owner, non-admin actor', () => {
      provider.findByPatient.mockReturnValue(makeNarrative('p1'));
      expect(() => service.getTimeline('p1', otherPatient)).toThrow(ForbiddenException);
      expect(() => service.getChapters('p1', otherPatient)).toThrow(ForbiddenException);
      expect(() => service.getSummary('p1', otherPatient)).toThrow(ForbiddenException);
    });
  });

  describe('BioBookProvider (integration)', () => {
    it('stores and retrieves a generated narrative for its owner', () => {
      const realProvider = new BioBookProvider();
      const realService = new BioBookService(realProvider);
      const integrationOwner: JwtPayload = { sub: 'p-integration', email: 'x@example.com', role: 'PATIENT' };
      const dto = {
        patientId: 'p-integration',
        events: [
          { eventType: 'LAB_RESULT', date: '2024-03-01T00:00:00Z', severity: 'MILD', biomarkers: { glucose: 95 } },
          { eventType: 'CONSULTATION', date: '2024-06-01T00:00:00Z', severity: 'INFORMATIONAL' },
        ],
      };
      const narrative = realService.generate(dto, integrationOwner);
      expect(narrative).toBeInstanceOf(HealthNarrative);
      expect(narrative.patientId).toBe('p-integration');
      expect(narrative.events.length).toBe(2);

      const retrieved = realService.getNarrative('p-integration', integrationOwner);
      expect(retrieved.id).toBe(narrative.id);
    });

    it('throws NotFoundException for unknown patient in real provider', () => {
      const realProvider = new BioBookProvider();
      const realService = new BioBookService(realProvider);
      const selfOwner: JwtPayload = { sub: 'no-such-patient', email: 'x@example.com', role: 'PATIENT' };
      expect(() => realService.getNarrative('no-such-patient', selfOwner)).toThrow(NotFoundException);
    });

    it('SECURITY (IDOR): real provider rejects a different authenticated patient', () => {
      const realProvider = new BioBookProvider();
      const realService = new BioBookService(realProvider);
      realService.generate({ patientId: 'p1', events: [] }, owner);
      expect(() => realService.getNarrative('p1', otherPatient)).toThrow(ForbiddenException);
    });
  });
});
