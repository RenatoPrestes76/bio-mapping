import { NotFoundException } from '@nestjs/common';
import { BioBookController } from '../bio-book.controller.js';
import { BioBookService } from '../bio-book.service.js';
import { HealthNarrative } from '../entities/health-narrative.entity.js';
import { NarrativeChapter } from '../entities/narrative-chapter.entity.js';
import { NarrativeEvent } from '../entities/narrative-event.entity.js';
import { HealthMilestone } from '../entities/health-milestone.entity.js';
import {
  BioBookResponseDto,
  BioBookTimelineResponseDto,
  BioBookChaptersResponseDto,
  BioBookSummaryResponseDto,
} from '../dto/bio-book.dto.js';

jest.mock('../../identity/auth/guards/jwt-auth.guard.js', () => ({
  JwtAuthGuard: jest.fn().mockImplementation(() => ({ canActivate: () => true })),
}));

const BASE_DATE = new Date('2024-03-01T00:00:00Z');
const LATER_DATE = new Date('2024-06-01T00:00:00Z');

function makeNarrative(patientId: string): HealthNarrative {
  const event = new NarrativeEvent({
    patientId, eventType: 'LAB_RESULT', date: BASE_DATE, narrativeText: 'Resultado laboratorial.',
    significance: 'HIGH',
  });
  const chapter = new NarrativeChapter({
    number: 1, theme: 'INITIAL_BASELINE', startDate: BASE_DATE, endDate: LATER_DATE,
    events: [event], summary: 'Período inicial.', keyInsight: 'Evento relevante.', highlights: ['Lab'],
  });
  const milestone = new HealthMilestone({
    patientId, milestoneType: 'FIRST_RECORD', title: 'Início', description: 'Primeiro registro',
    achievedAt: BASE_DATE, rank: 'MINOR',
  });
  return new HealthNarrative({
    patientId, chapters: [chapter], milestones: [milestone], events: [event],
    summary: {
      headline: 'Jornada positiva', overview: 'Overview', keyAchievements: ['Início'],
      currentStatus: 'OK', nextSteps: ['Manter exames'], positiveCount: 1, concernCount: 0,
      totalChapters: 1, totalMilestones: 1, journeyDurationDays: 92,
    },
  });
}

describe('BioBookController', () => {
  let controller: BioBookController;
  let service: jest.Mocked<BioBookService>;

  beforeEach(() => {
    service = {
      generate: jest.fn(),
      getNarrative: jest.fn(),
      getTimeline: jest.fn(),
      getChapters: jest.fn(),
      getSummary: jest.fn(),
    } as unknown as jest.Mocked<BioBookService>;
    controller = new BioBookController(service);
  });

  describe('POST /bio-book/generate', () => {
    it('returns BioBookResponseDto', () => {
      const narrative = makeNarrative('p1');
      service.generate.mockReturnValue(narrative);
      const dto = { patientId: 'p1', events: [] };
      const result = controller.generate(dto);
      expect(service.generate).toHaveBeenCalledWith(dto);
      expect(result).toBeInstanceOf(BioBookResponseDto);
      expect(result.patientId).toBe('p1');
      expect(result.bioBookId).toBeTruthy();
    });

    it('response includes timeline, chapters, and summary', () => {
      const narrative = makeNarrative('p1');
      service.generate.mockReturnValue(narrative);
      const result = controller.generate({ patientId: 'p1' });
      expect(result.timeline).toBeInstanceOf(BioBookTimelineResponseDto);
      expect(result.chapters).toBeInstanceOf(BioBookChaptersResponseDto);
      expect(result.summary).toBeInstanceOf(BioBookSummaryResponseDto);
    });

    it('generatedAt is an ISO string', () => {
      service.generate.mockReturnValue(makeNarrative('p1'));
      const result = controller.generate({ patientId: 'p1' });
      expect(() => new Date(result.generatedAt)).not.toThrow();
      expect(new Date(result.generatedAt).getFullYear()).toBeGreaterThan(2020);
    });
  });

  describe('GET /bio-book/timeline/:patientId', () => {
    it('returns BioBookTimelineResponseDto', () => {
      const narrative = makeNarrative('p1');
      service.getTimeline.mockReturnValue(narrative);
      const result = controller.getTimeline('p1');
      expect(result).toBeInstanceOf(BioBookTimelineResponseDto);
      expect(result.patientId).toBe('p1');
      expect(result.totalEvents).toBe(1);
    });

    it('events have expected shape', () => {
      service.getTimeline.mockReturnValue(makeNarrative('p1'));
      const result = controller.getTimeline('p1');
      expect(result.events[0]).toHaveProperty('id');
      expect(result.events[0]).toHaveProperty('eventType');
      expect(result.events[0]).toHaveProperty('narrativeText');
      expect(result.events[0]).toHaveProperty('significance');
      expect(result.events[0]).toHaveProperty('chapterNumber');
      expect(result.events[0]).toHaveProperty('date');
    });

    it('propagates NotFoundException', () => {
      service.getTimeline.mockImplementation(() => { throw new NotFoundException(); });
      expect(() => controller.getTimeline('missing')).toThrow(NotFoundException);
    });
  });

  describe('GET /bio-book/chapters/:patientId', () => {
    it('returns BioBookChaptersResponseDto', () => {
      const narrative = makeNarrative('p1');
      service.getChapters.mockReturnValue(narrative);
      const result = controller.getChapters('p1');
      expect(result).toBeInstanceOf(BioBookChaptersResponseDto);
      expect(result.patientId).toBe('p1');
      expect(result.totalChapters).toBe(1);
    });

    it('chapters have expected shape', () => {
      service.getChapters.mockReturnValue(makeNarrative('p1'));
      const result = controller.getChapters('p1');
      const c = result.chapters[0];
      expect(c).toHaveProperty('number', 1);
      expect(c).toHaveProperty('title');
      expect(c).toHaveProperty('subtitle');
      expect(c).toHaveProperty('theme');
      expect(c).toHaveProperty('startDate');
      expect(c).toHaveProperty('endDate');
      expect(c).toHaveProperty('durationDays');
      expect(c).toHaveProperty('summary');
      expect(c).toHaveProperty('keyInsight');
      expect(c).toHaveProperty('highlights');
      expect(c).toHaveProperty('eventCount');
      expect(c).toHaveProperty('milestoneCount');
    });

    it('propagates NotFoundException', () => {
      service.getChapters.mockImplementation(() => { throw new NotFoundException(); });
      expect(() => controller.getChapters('missing')).toThrow(NotFoundException);
    });
  });

  describe('GET /bio-book/summary/:patientId', () => {
    it('returns BioBookSummaryResponseDto', () => {
      const narrative = makeNarrative('p1');
      service.getSummary.mockReturnValue(narrative);
      const result = controller.getSummary('p1');
      expect(result).toBeInstanceOf(BioBookSummaryResponseDto);
      expect(result.patientId).toBe('p1');
    });

    it('summary contains all required fields', () => {
      service.getSummary.mockReturnValue(makeNarrative('p1'));
      const result = controller.getSummary('p1');
      expect(result.summary).toHaveProperty('headline');
      expect(result.summary).toHaveProperty('overview');
      expect(result.summary).toHaveProperty('keyAchievements');
      expect(result.summary).toHaveProperty('currentStatus');
      expect(result.summary).toHaveProperty('nextSteps');
      expect(result.summary).toHaveProperty('positiveCount');
      expect(result.summary).toHaveProperty('concernCount');
    });

    it('milestones array is present with expected shape', () => {
      service.getSummary.mockReturnValue(makeNarrative('p1'));
      const result = controller.getSummary('p1');
      expect(Array.isArray(result.milestones)).toBe(true);
      expect(result.milestones[0]).toHaveProperty('id');
      expect(result.milestones[0]).toHaveProperty('type');
      expect(result.milestones[0]).toHaveProperty('title');
      expect(result.milestones[0]).toHaveProperty('rank');
      expect(result.milestones[0]).toHaveProperty('achievedAt');
    });

    it('generatedAt is an ISO string', () => {
      service.getSummary.mockReturnValue(makeNarrative('p1'));
      const result = controller.getSummary('p1');
      expect(() => new Date(result.generatedAt)).not.toThrow();
    });

    it('propagates NotFoundException', () => {
      service.getSummary.mockImplementation(() => { throw new NotFoundException(); });
      expect(() => controller.getSummary('missing')).toThrow(NotFoundException);
    });
  });
});
