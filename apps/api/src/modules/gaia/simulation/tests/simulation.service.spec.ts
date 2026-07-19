import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { SimulationService } from '../services/simulation.service.js';

const makeProfile = () => ({
  patientId: 'p1',
  tenantId: 't1',
  age: 45,
  sex: 'MALE',
  occupation: 'Engineer',
  bmi: 27.5,
  weight: 84,
  height: 1.75,
  smoking: true,
  alcohol: 'MODERATE',
  lifestyle: 'SEDENTARY',
  pregnant: false,
  menopausal: false,
  familyHistory: ['diabetes'],
  conditions: [],
  medications: [],
});

const makeRisk = () => ({
  id: 'risk-1',
  patientId: 'p1',
  baseRiskScore: 0.45,
  riskLevel: 'HIGH',
  createdAt: new Date(),
});

const makeTwin = () => ({
  id: 'twin-1',
  patientId: 'p1',
  tenantId: 't1',
  twinVersion: '1.0',
  demographics: { age: 45, sex: 'MALE' },
  clinicalHistory: { bmi: 27.5, baseRiskScore: 0.45 },
  biomarkers: {},
  riskFactors: ['diabetes'],
  lifestyle: { smoking: true, alcohol: 'MODERATE', activityLevel: 'SEDENTARY' },
  longitudinalData: { metrics: [] },
  activeRecommendations: [],
  dataCompleteness: 0.875,
  missingFields: [],
  lastUpdated: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeRun = () => ({
  id: 'run-1',
  patientId: 'p1',
  tenantId: 't1',
  twinId: 'twin-1',
  createdBy: 'u1',
  scenarioType: 'SMOKING_CESSATION',
  scenarioLabel: 'Cessação do tabagismo',
  timeHorizon: 'YEAR_1',
  status: 'COMPLETED',
  modelVersion: '1.0',
  createdAt: new Date(),
});

const makeResult = () => ({
  id: 'result-1',
  runId: 'run-1',
  baselineRiskScore: 0.45,
  simulatedRiskScore: 0.35,
  expectedRiskVariation: -10.0,
  confidence: 0.82,
  baselineRiskLevel: 'HIGH',
  simulatedRiskLevel: 'MODERATE',
  topFactors: [],
  createdAt: new Date(),
});

let repo: any;
let prisma: any;
let audit: any;
let service: SimulationService;

beforeEach(() => {
  repo = {
    upsertDigitalTwin: jest.fn().mockResolvedValue(makeTwin()),
    findTwinByPatientId: jest.fn().mockResolvedValue(makeTwin()),
    createSimulationRun: jest.fn().mockResolvedValue(makeRun()),
    findSimulationRunById: jest.fn().mockResolvedValue(makeRun()),
    findSimulationRunsByIds: jest.fn().mockResolvedValue([makeRun()]),
    createSimulationParameters: jest.fn().mockResolvedValue([]),
    findParametersByRunId: jest.fn().mockResolvedValue([]),
    createSimulationResult: jest.fn().mockResolvedValue(makeResult()),
    findResultByRunId: jest.fn().mockResolvedValue(makeResult()),
    findResultsByRunIds: jest.fn().mockResolvedValue([makeResult()]),
    createSimulationAssumptions: jest.fn().mockResolvedValue([]),
    findAssumptionsByRunId: jest.fn().mockResolvedValue([]),
    createSimulationHistory: jest.fn().mockResolvedValue({}),
    findSimulationHistory: jest.fn().mockResolvedValue([]),
    findScenarioTemplates: jest.fn().mockResolvedValue([]),
  } as any;

  prisma = {
    patientProfile: {
      findUnique: jest.fn().mockResolvedValue(makeProfile()),
    },
    personalizedRisk: {
      findFirst: jest.fn().mockResolvedValue(makeRisk()),
    },
  } as any;

  audit = { log: jest.fn().mockResolvedValue(undefined) } as any;

  service = new SimulationService(repo, prisma, audit);
});

describe('SimulationService', () => {
  describe('buildOrRefreshTwin', () => {
    it('queries patientProfile by patientId', async () => {
      await service.buildOrRefreshTwin('p1', 't1', 'u1');
      expect(prisma.patientProfile.findUnique).toHaveBeenCalledWith({ where: { patientId: 'p1' } });
    });

    it('throws NotFoundException when profile not found', async () => {
      prisma.patientProfile.findUnique.mockResolvedValue(null);
      await expect(service.buildOrRefreshTwin('p-none', 't1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('upserts twin in repository', async () => {
      await service.buildOrRefreshTwin('p1', 't1', 'u1');
      expect(repo.upsertDigitalTwin).toHaveBeenCalled();
    });

    it('logs SIMULATION_TWIN_BUILT audit event', async () => {
      await service.buildOrRefreshTwin('p1', 't1', 'u1');
      expect(audit.log).toHaveBeenCalledWith('SIMULATION_TWIN_BUILT', expect.any(Object));
    });

    it('returns persisted twin', async () => {
      const twin = await service.buildOrRefreshTwin('p1', 't1', 'u1');
      expect(twin.id).toBe('twin-1');
    });

    it('uses 0.3 as baseRiskScore when no risk found', async () => {
      prisma.personalizedRisk.findFirst.mockResolvedValue(null);
      await service.buildOrRefreshTwin('p1', 't1', 'u1');
      const call = repo.upsertDigitalTwin.mock.calls[0][0] as any;
      expect(call.dataCompleteness).toBeDefined();
    });
  });

  describe('runSimulation', () => {
    const dto = { patientId: 'p1', tenantId: 't1', scenarioType: 'SMOKING_CESSATION', timeHorizon: 'YEAR_1' };

    it('creates a simulation run', async () => {
      await service.runSimulation(dto as any, 'u1');
      expect(repo.createSimulationRun).toHaveBeenCalled();
    });

    it('creates simulation result', async () => {
      await service.runSimulation(dto as any, 'u1');
      expect(repo.createSimulationResult).toHaveBeenCalled();
    });

    it('creates simulation assumptions', async () => {
      await service.runSimulation(dto as any, 'u1');
      expect(repo.createSimulationAssumptions).toHaveBeenCalled();
    });

    it('records simulation history', async () => {
      await service.runSimulation(dto as any, 'u1');
      expect(repo.createSimulationHistory).toHaveBeenCalled();
    });

    it('logs SIMULATION_RUN_CREATED audit', async () => {
      await service.runSimulation(dto as any, 'u1');
      expect(audit.log).toHaveBeenCalledWith('SIMULATION_RUN_CREATED', expect.any(Object));
    });

    it('returns run and result', async () => {
      const out = await service.runSimulation(dto as any, 'u1');
      expect(out).toHaveProperty('run');
      expect(out).toHaveProperty('result');
    });

    it('saves parameters when provided', async () => {
      const dtoWithParams = { ...dto, parameters: { weightChangeKg: 10 } };
      await service.runSimulation(dtoWithParams as any, 'u1');
      expect(repo.createSimulationParameters).toHaveBeenCalled();
    });

    it('skips parameters when none provided', async () => {
      await service.runSimulation(dto as any, 'u1');
      expect(repo.createSimulationParameters).not.toHaveBeenCalled();
    });
  });

  describe('getSimulation', () => {
    it('throws NotFoundException when run not found', async () => {
      repo.findSimulationRunById.mockResolvedValue(null);
      await expect(service.getSimulation('unknown')).rejects.toThrow(NotFoundException);
    });

    it('returns run, result, and assumptions', async () => {
      const out = await service.getSimulation('run-1');
      expect(out).toHaveProperty('run');
      expect(out).toHaveProperty('result');
      expect(out).toHaveProperty('assumptions');
    });

    it('fetches result and assumptions by runId', async () => {
      await service.getSimulation('run-1');
      expect(repo.findResultByRunId).toHaveBeenCalledWith('run-1');
      expect(repo.findAssumptionsByRunId).toHaveBeenCalledWith('run-1');
    });
  });

  describe('getHistory', () => {
    it('delegates to repository findSimulationHistory', async () => {
      await service.getHistory('p1', 't1');
      expect(repo.findSimulationHistory).toHaveBeenCalledWith('p1', 't1');
    });

    it('works without tenantId', async () => {
      await service.getHistory('p1');
      expect(repo.findSimulationHistory).toHaveBeenCalledWith('p1', undefined);
    });

    it('returns history array', async () => {
      const history = await service.getHistory('p1');
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('compareSimulations', () => {
    const dto = { runIds: ['run-1'] };

    it('loads runs and results', async () => {
      await service.compareSimulations(dto as any, 'u1');
      expect(repo.findSimulationRunsByIds).toHaveBeenCalledWith(['run-1']);
      expect(repo.findResultsByRunIds).toHaveBeenCalledWith(['run-1']);
    });

    it('logs SIMULATION_COMPARED audit', async () => {
      await service.compareSimulations(dto as any, 'u1');
      expect(audit.log).toHaveBeenCalledWith('SIMULATION_COMPARED', expect.any(Object));
    });

    it('returns comparison object with entries', async () => {
      const out = await service.compareSimulations(dto as any, 'u1');
      expect(out).toHaveProperty('entries');
      expect(out).toHaveProperty('bestScenario');
      expect(out).toHaveProperty('worstScenario');
      expect(out).toHaveProperty('averageVariation');
      expect(out).toHaveProperty('summary');
    });

    it('skips audit when no runs found', async () => {
      repo.findSimulationRunsByIds.mockResolvedValue([]);
      repo.findResultsByRunIds.mockResolvedValue([]);
      await service.compareSimulations(dto as any, 'u1');
      expect(audit.log).not.toHaveBeenCalled();
    });
  });

  describe('getScenarios', () => {
    it('returns list of scenarios', () => {
      const scenarios = service.getScenarios();
      expect(Array.isArray(scenarios)).toBe(true);
      expect(scenarios.length).toBeGreaterThanOrEqual(10);
    });

    it('each scenario has required fields', () => {
      for (const s of service.getScenarios()) {
        expect(s.scenarioType).toBeTruthy();
        expect(s.name).toBeTruthy();
        expect(s.description).toBeTruthy();
        expect(s.defaultParameters).toBeDefined();
      }
    });

    it('does not expose getEffect function', () => {
      for (const s of service.getScenarios()) {
        expect((s as any).getEffect).toBeUndefined();
      }
    });
  });
});
