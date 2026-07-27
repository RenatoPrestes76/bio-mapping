import { NotFoundException } from '@nestjs/common';
import { BioBookJourneyService } from '../bio-book-journey.service.js';
import { JourneyReport } from '../entities/journey-report.entity.js';
import { JourneyPath } from '../entities/journey-path.entity.js';
import { JourneyPhase } from '../entities/journey-phase.entity.js';

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
    it('delegates to provider and returns a JourneyReport', () => {
      const provider = makeProvider();
      const service = new BioBookJourneyService(provider as never);
      const result = service.analyze({ patientId: 'p1' });
      expect(provider.analyze).toHaveBeenCalledWith({ patientId: 'p1' });
      expect(result).toBeInstanceOf(JourneyReport);
    });
  });

  describe('getReport()', () => {
    it('returns report when found', () => {
      const report = makeReport('p1');
      const provider = makeProvider(report);
      const service = new BioBookJourneyService(provider as never);
      expect(service.getReport('p1')).toBe(report);
    });

    it('throws NotFoundException when not found', () => {
      const provider = makeProvider();
      const service = new BioBookJourneyService(provider as never);
      expect(() => service.getReport('unknown')).toThrow(NotFoundException);
    });
  });

  describe('getPath()', () => {
    it('returns the same report as getReport()', () => {
      const report = makeReport('p1');
      const provider = makeProvider(report);
      const service = new BioBookJourneyService(provider as never);
      expect(service.getPath('p1')).toBe(report);
    });

    it('throws NotFoundException for unknown patient', () => {
      const provider = makeProvider();
      const service = new BioBookJourneyService(provider as never);
      expect(() => service.getPath('ghost')).toThrow(NotFoundException);
    });
  });

  describe('getNextSteps()', () => {
    it('returns the report for a valid patient', () => {
      const report = makeReport('p1');
      const provider = makeProvider(report);
      const service = new BioBookJourneyService(provider as never);
      expect(service.getNextSteps('p1')).toBe(report);
    });

    it('throws NotFoundException for unknown patient', () => {
      const provider = makeProvider();
      const service = new BioBookJourneyService(provider as never);
      expect(() => service.getNextSteps('ghost')).toThrow(NotFoundException);
    });
  });

  describe('getMilestones()', () => {
    it('returns the report for a valid patient', () => {
      const report = makeReport('p1');
      const provider = makeProvider(report);
      const service = new BioBookJourneyService(provider as never);
      expect(service.getMilestones('p1')).toBe(report);
    });

    it('throws NotFoundException for unknown patient', () => {
      const provider = makeProvider();
      const service = new BioBookJourneyService(provider as never);
      expect(() => service.getMilestones('ghost')).toThrow(NotFoundException);
    });
  });
});
