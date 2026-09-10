import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BioBookInsightService } from '../bio-book-insight.service.js';
import { BioBookInsightProvider } from '../providers/bio-book-insight.provider.js';
import { BioBookInsightReport } from '../entities/bio-book-insight-report.entity.js';
import { CurrentChapter } from '../entities/current-chapter.entity.js';
import type { JwtPayload } from '../../identity/auth/types/jwt-payload.interface.js';

const D = (iso: string) => new Date(iso);
const BASE = D('2024-03-01T00:00:00Z');

const owner: JwtPayload = { sub: 'p1', email: 'p1@example.com', role: 'PATIENT' };
const otherPatient: JwtPayload = { sub: 'p2', email: 'p2@example.com', role: 'PATIENT' };
const admin: JwtPayload = { sub: 'admin-1', email: 'admin@example.com', role: 'ADMIN' };

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
    it('delegates to provider using the authenticated user as patientId, ignoring any client-supplied patientId', () => {
      const report = makeReport('p1');
      provider.analyze.mockReturnValue(report);
      const dto = { patientId: 'someone-else', events: [] };
      expect(service.analyze(dto, owner)).toBe(report);
      expect(provider.analyze).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'p1' }));
    });
  });

  describe('getReport', () => {
    it('returns report when found and actor is the owner', () => {
      const report = makeReport('p1');
      provider.findByPatient.mockReturnValue(report);
      expect(service.getReport('p1', owner)).toBe(report);
    });

    it('returns report to an admin regardless of ownership', () => {
      provider.findByPatient.mockReturnValue(makeReport('p1'));
      expect(service.getReport('p1', admin)).toBeDefined();
    });

    it('throws NotFoundException when not found for its own (non-existent) record', () => {
      provider.findByPatient.mockReturnValue(undefined);
      const selfOwner: JwtPayload = { sub: 'unknown', email: 'x@example.com', role: 'PATIENT' };
      expect(() => service.getReport('unknown', selfOwner)).toThrow(NotFoundException);
    });

    it('SECURITY (IDOR): throws ForbiddenException when a different patient requests it', () => {
      provider.findByPatient.mockReturnValue(makeReport('p1'));
      expect(() => service.getReport('p1', otherPatient)).toThrow(ForbiddenException);
    });
  });

  describe('getInsights / getReflection / getGoals / getScoreEvolution / getCurrentChapter', () => {
    it('all delegate to getReport for the owner', () => {
      provider.findByPatient.mockReturnValue(makeReport('p1'));
      expect(service.getInsights('p1', owner)).toBeDefined();
      expect(service.getReflection('p1', owner)).toBeDefined();
      expect(service.getGoals('p1', owner)).toBeDefined();
      expect(service.getScoreEvolution('p1', owner)).toBeDefined();
      expect(service.getCurrentChapter('p1', owner)).toBeDefined();
    });

    it('SECURITY (IDOR): all five reject a non-owner, non-admin actor', () => {
      provider.findByPatient.mockReturnValue(makeReport('p1'));
      expect(() => service.getInsights('p1', otherPatient)).toThrow(ForbiddenException);
      expect(() => service.getReflection('p1', otherPatient)).toThrow(ForbiddenException);
      expect(() => service.getGoals('p1', otherPatient)).toThrow(ForbiddenException);
      expect(() => service.getScoreEvolution('p1', otherPatient)).toThrow(ForbiddenException);
      expect(() => service.getCurrentChapter('p1', otherPatient)).toThrow(ForbiddenException);
    });
  });
});
