import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BioBookJourneyService } from '../bio-book-journey.service.js';
import { JourneyReport } from '../entities/journey-report.entity.js';
import { JourneyPath } from '../entities/journey-path.entity.js';
import { JourneyPhase } from '../entities/journey-phase.entity.js';
import type { JwtPayload } from '../../identity/auth/types/jwt-payload.interface.js';

const owner: JwtPayload = { sub: 'p1', email: 'p1@example.com', role: 'PATIENT' };
const otherPatient: JwtPayload = { sub: 'p2', email: 'p2@example.com', role: 'PATIENT' };
const admin: JwtPayload = { sub: 'admin-1', email: 'admin@example.com', role: 'ADMIN' };

const makePath = () =>
  new JourneyPath({
    patientId: 'p1',
    phases: [new JourneyPhase({ type: 'INITIAL_ASSESSMENT', status: 'CURRENT', order: 1, keyActions: [], successCriteria: [] })],
    currentPhaseIndex: 0,
    progressPercentage: 0,
    overallDirection: 'STABLE',
    narrative: 'Start.',
  });

const makeReport = (patientId: string) =>
  new JourneyReport({ patientId, journeyPath: makePath(), recommendations: [], habitPatterns: [], milestonePredictions: [] });

const makeProvider = (report?: JourneyReport) => ({
  analyze: jest.fn().mockReturnValue(report ?? makeReport('p1')),
  findByPatient: jest.fn().mockImplementation((id: string) => {
    if (id === (report?.patientId ?? 'p1')) return report ?? makeReport('p1');
    return undefined;
  }),
});

describe('BioBookJourneyService', () => {
  describe('analyze()', () => {
    it('delegates to provider using the authenticated user as patientId, ignoring any client-supplied patientId', () => {
      const provider = makeProvider();
      const service = new BioBookJourneyService(provider as never);
      const result = service.analyze({ patientId: 'someone-else' }, owner);
      expect(provider.analyze).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'p1' }));
      expect(result).toBeInstanceOf(JourneyReport);
    });
  });

  describe('getReport()', () => {
    it('returns report when found and actor is the owner', () => {
      const report = makeReport('p1');
      const provider = makeProvider(report);
      const service = new BioBookJourneyService(provider as never);
      expect(service.getReport('p1', owner)).toBe(report);
    });

    it('returns report to an admin regardless of ownership', () => {
      const report = makeReport('p1');
      const provider = makeProvider(report);
      const service = new BioBookJourneyService(provider as never);
      expect(service.getReport('p1', admin)).toBe(report);
    });

    it('throws NotFoundException when not found for its own (non-existent) record', () => {
      const provider = makeProvider();
      const service = new BioBookJourneyService(provider as never);
      const selfOwner: JwtPayload = { sub: 'unknown', email: 'x@example.com', role: 'PATIENT' };
      expect(() => service.getReport('unknown', selfOwner)).toThrow(NotFoundException);
    });

    it('SECURITY (IDOR): throws ForbiddenException when a different patient requests it', () => {
      const report = makeReport('p1');
      const provider = makeProvider(report);
      const service = new BioBookJourneyService(provider as never);
      expect(() => service.getReport('p1', otherPatient)).toThrow(ForbiddenException);
    });
  });

  describe('getPath() / getNextSteps() / getMilestones()', () => {
    it('all return the report for its own owner', () => {
      const report = makeReport('p1');
      const provider = makeProvider(report);
      const service = new BioBookJourneyService(provider as never);
      expect(service.getPath('p1', owner)).toBe(report);
      expect(service.getNextSteps('p1', owner)).toBe(report);
      expect(service.getMilestones('p1', owner)).toBe(report);
    });

    it('SECURITY (IDOR): all three reject a non-owner, non-admin actor', () => {
      const report = makeReport('p1');
      const provider = makeProvider(report);
      const service = new BioBookJourneyService(provider as never);
      expect(() => service.getPath('p1', otherPatient)).toThrow(ForbiddenException);
      expect(() => service.getNextSteps('p1', otherPatient)).toThrow(ForbiddenException);
      expect(() => service.getMilestones('p1', otherPatient)).toThrow(ForbiddenException);
    });
  });
});
