import { NotFoundException } from '@nestjs/common';
import { BioBookJourneyController } from '../bio-book-journey.controller.js';
import { JourneyReport } from '../entities/journey-report.entity.js';
import { JourneyPath } from '../entities/journey-path.entity.js';
import { JourneyPhase } from '../entities/journey-phase.entity.js';
import {
  BioBookJourneyResponseDto,
  JourneyPathResponseDto,
  NextStepsResponseDto,
  MilestonePredictionsResponseDto,
} from '../dto/bio-book-journey.dto.js';

const makePath = (patientId = 'p1') =>
  new JourneyPath({
    patientId,
    phases: [
      new JourneyPhase({ type: 'INITIAL_ASSESSMENT', status: 'CURRENT', order: 1, keyActions: ['A1'], successCriteria: ['C1'] }),
      new JourneyPhase({ type: 'BASELINE_ESTABLISHMENT', status: 'UPCOMING', order: 2, keyActions: ['A2'], successCriteria: ['C2'] }),
    ],
    currentPhaseIndex: 0,
    progressPercentage: 0,
    overallDirection: 'STABLE',
    narrative: 'Início da jornada.',
  });

const makeReport = (patientId = 'p1') =>
  new JourneyReport({
    patientId,
    journeyPath: makePath(patientId),
    recommendations: [],
    habitPatterns: [],
    milestonePredictions: [],
  });

const makeService = (report?: JourneyReport) => ({
  analyze: jest.fn().mockReturnValue(report ?? makeReport()),
  getPath: jest.fn().mockImplementation((id: string) => {
    if (id === (report?.patientId ?? 'p1')) return report ?? makeReport();
    throw new NotFoundException();
  }),
  getNextSteps: jest.fn().mockImplementation((id: string) => {
    if (id === (report?.patientId ?? 'p1')) return report ?? makeReport();
    throw new NotFoundException();
  }),
  getMilestones: jest.fn().mockImplementation((id: string) => {
    if (id === (report?.patientId ?? 'p1')) return report ?? makeReport();
    throw new NotFoundException();
  }),
});

describe('BioBookJourneyController', () => {
  describe('POST /bio-book-journey/analyze', () => {
    it('returns BioBookJourneyResponseDto on valid input', () => {
      const service = makeService();
      const ctrl = new BioBookJourneyController(service as never);
      const result = ctrl.analyze({ patientId: 'p1' });
      expect(result).toBeInstanceOf(BioBookJourneyResponseDto);
      expect(result.patientId).toBe('p1');
    });

    it('calls service.analyze with the DTO', () => {
      const service = makeService();
      const ctrl = new BioBookJourneyController(service as never);
      ctrl.analyze({ patientId: 'p1' });
      expect(service.analyze).toHaveBeenCalledWith({ patientId: 'p1' });
    });

    it('returned DTO contains journeyPath, nextSteps, milestonePredictions', () => {
      const service = makeService();
      const ctrl = new BioBookJourneyController(service as never);
      const result = ctrl.analyze({ patientId: 'p1' });
      expect(result.journeyPath).toBeDefined();
      expect(result.nextSteps).toBeDefined();
      expect(result.milestonePredictions).toBeDefined();
    });

    it('generatedAt is a valid ISO string', () => {
      const service = makeService();
      const ctrl = new BioBookJourneyController(service as never);
      const result = ctrl.analyze({ patientId: 'p1' });
      expect(() => new Date(result.generatedAt)).not.toThrow();
    });
  });

  describe('GET /bio-book-journey/path/:patientId', () => {
    it('returns JourneyPathResponseDto for known patient', () => {
      const service = makeService();
      const ctrl = new BioBookJourneyController(service as never);
      const result = ctrl.getPath('p1');
      expect(result).toBeInstanceOf(JourneyPathResponseDto);
      expect(result.patientId).toBe('p1');
    });

    it('throws NotFoundException for unknown patient', () => {
      const service = makeService();
      const ctrl = new BioBookJourneyController(service as never);
      expect(() => ctrl.getPath('unknown')).toThrow(NotFoundException);
    });

    it('includes phases array', () => {
      const service = makeService();
      const ctrl = new BioBookJourneyController(service as never);
      const result = ctrl.getPath('p1');
      expect(Array.isArray(result.phases)).toBe(true);
    });

    it('includes overallDirection', () => {
      const service = makeService();
      const ctrl = new BioBookJourneyController(service as never);
      const result = ctrl.getPath('p1');
      expect(result.overallDirection).toBe('STABLE');
    });

    it('currentPhase is defined for active journey', () => {
      const service = makeService();
      const ctrl = new BioBookJourneyController(service as never);
      const result = ctrl.getPath('p1');
      expect(result.currentPhase).toBeDefined();
    });

    it('completedPhaseCount is 0 for new journey', () => {
      const service = makeService();
      const ctrl = new BioBookJourneyController(service as never);
      const result = ctrl.getPath('p1');
      expect(result.completedPhaseCount).toBe(0);
    });
  });

  describe('GET /bio-book-journey/next-steps/:patientId', () => {
    it('returns NextStepsResponseDto for known patient', () => {
      const service = makeService();
      const ctrl = new BioBookJourneyController(service as never);
      const result = ctrl.getNextSteps('p1');
      expect(result).toBeInstanceOf(NextStepsResponseDto);
      expect(result.patientId).toBe('p1');
    });

    it('throws NotFoundException for unknown patient', () => {
      const service = makeService();
      const ctrl = new BioBookJourneyController(service as never);
      expect(() => ctrl.getNextSteps('unknown')).toThrow(NotFoundException);
    });

    it('nextStep is a non-empty string', () => {
      const service = makeService();
      const ctrl = new BioBookJourneyController(service as never);
      const result = ctrl.getNextSteps('p1');
      expect(typeof result.nextStep).toBe('string');
      expect(result.nextStep.length).toBeGreaterThan(0);
    });

    it('recommendations and habitPatterns are arrays', () => {
      const service = makeService();
      const ctrl = new BioBookJourneyController(service as never);
      const result = ctrl.getNextSteps('p1');
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(Array.isArray(result.habitPatterns)).toBe(true);
    });
  });

  describe('GET /bio-book-journey/milestones/:patientId', () => {
    it('returns MilestonePredictionsResponseDto for known patient', () => {
      const service = makeService();
      const ctrl = new BioBookJourneyController(service as never);
      const result = ctrl.getMilestones('p1');
      expect(result).toBeInstanceOf(MilestonePredictionsResponseDto);
      expect(result.patientId).toBe('p1');
    });

    it('throws NotFoundException for unknown patient', () => {
      const service = makeService();
      const ctrl = new BioBookJourneyController(service as never);
      expect(() => ctrl.getMilestones('unknown')).toThrow(NotFoundException);
    });

    it('totalPredictions matches predictions array length', () => {
      const service = makeService();
      const ctrl = new BioBookJourneyController(service as never);
      const result = ctrl.getMilestones('p1');
      expect(result.totalPredictions).toBe(result.predictions.length);
    });

    it('highConfidenceCount is a non-negative number', () => {
      const service = makeService();
      const ctrl = new BioBookJourneyController(service as never);
      const result = ctrl.getMilestones('p1');
      expect(result.highConfidenceCount).toBeGreaterThanOrEqual(0);
    });

    it('predictions array contains objects with required fields', () => {
      const service = makeService();
      const ctrl = new BioBookJourneyController(service as never);
      const result = ctrl.getMilestones('p1');
      for (const p of result.predictions) {
        expect(p.id).toBeDefined();
        expect(p.title).toBeDefined();
        expect(p.confidence).toBeDefined();
        expect(p.category).toBeDefined();
      }
    });
  });
});
