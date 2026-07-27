import { NotFoundException } from '@nestjs/common';
import { BioBookInsightService } from '../bio-book-insight.service.js';
import { BioBookInsightProvider } from '../providers/bio-book-insight.provider.js';
import { BioBookInsightReport } from '../entities/bio-book-insight-report.entity.js';
import { CurrentChapter } from '../entities/current-chapter.entity.js';

const D = (iso: string) => new Date(iso);
const BASE = D('2024-03-01T00:00:00Z');

function makeReport(patientId: string): BioBookInsightReport {
  const chapter = new CurrentChapter({ patientId, chapterNumber: 1, chapterTitle: 'T', description: 'D', focus: [], startedAt: BASE, theme: 'STABILITY' });
  return new BioBookInsightReport({ patientId, insights: [], reflections: [], goals: [], scoreEvolution: [], currentChapter: chapter });
}

describe('BioBookInsightService', () => {
  let service: BioBookInsightService;
  let provider: jest.Mocked<BioBookInsightProvider>;

  beforeEach(() => {
    provider = {
      analyze: jest.fn(),
      findByPatient: jest.fn(),
      listAll: jest.fn(),
    } as unknown as jest.Mocked<BioBookInsightProvider>;
    service = new BioBookInsightService(provider);
  });

  describe('analyze', () => {
    it('delegates to provider', () => {
      const report = makeReport('p1');
      provider.analyze.mockReturnValue(report);
      const dto = { patientId: 'p1', events: [] };
      expect(service.analyze(dto)).toBe(report);
      expect(provider.analyze).toHaveBeenCalledWith(dto);
    });
  });

  describe('getReport', () => {
    it('returns report when found', () => {
      const report = makeReport('p1');
      provider.findByPatient.mockReturnValue(report);
      expect(service.getReport('p1')).toBe(report);
    });

    it('throws NotFoundException when not found', () => {
      provider.findByPatient.mockReturnValue(undefined);
      expect(() => service.getReport('unknown')).toThrow(NotFoundException);
    });
  });

  describe('getInsights', () => {
    it('returns report', () => {
      const report = makeReport('p1');
      provider.findByPatient.mockReturnValue(report);
      expect(service.getInsights('p1')).toBe(report);
    });

    it('throws NotFoundException when not found', () => {
      provider.findByPatient.mockReturnValue(undefined);
      expect(() => service.getInsights('x')).toThrow(NotFoundException);
    });
  });

  describe('getReflection', () => {
    it('returns report', () => {
      provider.findByPatient.mockReturnValue(makeReport('p1'));
      expect(service.getReflection('p1')).toBeDefined();
    });

    it('throws when not found', () => {
      provider.findByPatient.mockReturnValue(undefined);
      expect(() => service.getReflection('x')).toThrow(NotFoundException);
    });
  });

  describe('getGoals', () => {
    it('returns report', () => {
      provider.findByPatient.mockReturnValue(makeReport('p1'));
      expect(service.getGoals('p1')).toBeDefined();
    });

    it('throws when not found', () => {
      provider.findByPatient.mockReturnValue(undefined);
      expect(() => service.getGoals('x')).toThrow(NotFoundException);
    });
  });

  describe('getScoreEvolution', () => {
    it('returns report', () => {
      provider.findByPatient.mockReturnValue(makeReport('p1'));
      expect(service.getScoreEvolution('p1')).toBeDefined();
    });

    it('throws when not found', () => {
      provider.findByPatient.mockReturnValue(undefined);
      expect(() => service.getScoreEvolution('x')).toThrow(NotFoundException);
    });
  });

  describe('getCurrentChapter', () => {
    it('returns report', () => {
      provider.findByPatient.mockReturnValue(makeReport('p1'));
      expect(service.getCurrentChapter('p1')).toBeDefined();
    });

    it('throws when not found', () => {
      provider.findByPatient.mockReturnValue(undefined);
      expect(() => service.getCurrentChapter('x')).toThrow(NotFoundException);
    });
  });
});
