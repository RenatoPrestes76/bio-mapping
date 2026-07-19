import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SimulationController } from '../controllers/simulation.controller.js';

const makeRun = () => ({ id: 'run-1', scenarioType: 'SMOKING_CESSATION' });
const makeResult = () => ({ id: 'result-1', runId: 'run-1', simulatedRiskScore: 0.3 });
const user = { sub: 'u1' };

let service: any;
let controller: SimulationController;

beforeEach(() => {
  service = {
    runSimulation: jest.fn().mockResolvedValue({ run: makeRun(), result: makeResult() }),
    getScenarios: jest.fn().mockReturnValue([{ scenarioType: 'SMOKING_CESSATION', name: 'Cessação', description: 'Desc', defaultParameters: {} }]),
    getHistory: jest.fn().mockResolvedValue([]),
    compareSimulations: jest.fn().mockResolvedValue({ entries: [], bestScenario: null, worstScenario: null, averageVariation: 0, summary: '' }),
    getSimulation: jest.fn().mockResolvedValue({ run: makeRun(), result: makeResult(), assumptions: [] }),
  } as any;

  controller = new SimulationController(service);
});

describe('SimulationController', () => {
  describe('POST /simulation/run', () => {
    it('delegates to service.runSimulation with userId', async () => {
      const dto = { patientId: 'p1', scenarioType: 'SMOKING_CESSATION', timeHorizon: 'YEAR_1' };
      await controller.runSimulation(dto as any, user);
      expect(service.runSimulation).toHaveBeenCalledWith(dto, 'u1');
    });

    it('returns run and result', async () => {
      const dto = { patientId: 'p1', scenarioType: 'SMOKING_CESSATION', timeHorizon: 'YEAR_1' };
      const out = await controller.runSimulation(dto as any, user);
      expect(out).toHaveProperty('run');
      expect(out).toHaveProperty('result');
    });
  });

  describe('GET /simulation/scenarios', () => {
    it('delegates to service.getScenarios', () => {
      controller.getScenarios();
      expect(service.getScenarios).toHaveBeenCalled();
    });

    it('returns scenario list', () => {
      const result = controller.getScenarios();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('GET /simulation/history', () => {
    it('delegates to service.getHistory with patientId', async () => {
      await controller.getHistory('p1');
      expect(service.getHistory).toHaveBeenCalledWith('p1', undefined);
    });

    it('passes tenantId when provided', async () => {
      await controller.getHistory('p1', 't1');
      expect(service.getHistory).toHaveBeenCalledWith('p1', 't1');
    });

    it('returns history array', async () => {
      const out = await controller.getHistory('p1');
      expect(Array.isArray(out)).toBe(true);
    });
  });

  describe('POST /simulation/compare', () => {
    it('delegates to service.compareSimulations with userId', async () => {
      const dto = { runIds: ['r1', 'r2'] };
      await controller.compareSimulations(dto as any, user);
      expect(service.compareSimulations).toHaveBeenCalledWith(dto, 'u1');
    });

    it('returns comparison result', async () => {
      const dto = { runIds: ['r1', 'r2'] };
      const out = await controller.compareSimulations(dto as any, user);
      expect(out).toHaveProperty('entries');
      expect(out).toHaveProperty('bestScenario');
    });
  });

  describe('GET /simulation/:id', () => {
    it('delegates to service.getSimulation', async () => {
      await controller.getSimulation('run-1');
      expect(service.getSimulation).toHaveBeenCalledWith('run-1');
    });

    it('returns run, result, and assumptions', async () => {
      const out = await controller.getSimulation('run-1');
      expect(out).toHaveProperty('run');
      expect(out).toHaveProperty('result');
      expect(out).toHaveProperty('assumptions');
    });
  });
});
