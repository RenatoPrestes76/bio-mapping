import { Test, TestingModule } from '@nestjs/testing';
import { DigitalTwinController } from '../digital-twin.controller.js';
import { DigitalTwinService } from '../digital-twin.service.js';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard.js';
import { DigitalTwin, ClinicalState, RiskState } from '../entities/digital-twin.entity.js';
import { TwinSnapshot } from '../entities/twin-snapshot.entity.js';
import { SimulationScenario, ScenarioStatus } from '../entities/simulation-scenario.entity.js';
import { SimulationResult } from '../entities/simulation-result.entity.js';

const makeRiskState = (score = 40): RiskState => ({
  cardiovascularRisk: 'MODERATE',
  metabolicRisk: 'MODERATE',
  diabetesRisk: 'LOW',
  overallRisk: 'MODERATE',
  riskScore: score,
  lastUpdated: new Date(),
});

const makeClinicalState = (): ClinicalState => ({
  conditions: ['Hipertensão Arterial'],
  biomarkers: { fasting_glucose: 110, ldl: 155 },
  medications: ['Losartana'],
  symptoms: [],
  lastUpdated: new Date(),
});

const makeTwin = (): DigitalTwin =>
  new DigitalTwin({
    id: 'twin-ctrl-001',
    patientId: 'p-ctrl',
    profileSnapshot: {},
    clinicalState: makeClinicalState(),
    riskState: makeRiskState(),
  });

const makeSnapshot = (): TwinSnapshot =>
  new TwinSnapshot({
    id: 'snap-ctrl-001',
    twinId: 'twin-ctrl-001',
    clinicalIndicators: { version: 1 },
    biomarkers: { fasting_glucose: 110, ldl: 155 },
    riskScores: { overall: 40 },
    lifestyleMetrics: {},
  });

const makeScenario = (): SimulationScenario =>
  new SimulationScenario({
    id: 'scenario-ctrl-001',
    twinId: 'twin-ctrl-001',
    name: 'Test scenario',
    inputs: [{ type: 'MEDICATION', name: 'statin', value: 'x' }],
    status: ScenarioStatus.COMPLETED,
  });

const makeResult = (): SimulationResult =>
  new SimulationResult({
    id: 'result-ctrl-001',
    scenarioId: 'scenario-ctrl-001',
    predictedOutcomes: [
      { metric: 'ldl', currentValue: 155, predictedValue: 93, timeframeWeeks: 6, confidence: 0.9 },
    ],
    riskChanges: [
      { riskType: 'cardiovascular', currentLevel: 'MODERATE', predictedLevel: 'LOW', delta: -18, direction: 'IMPROVED' },
    ],
    recommendations: ['Monitorar enzimas hepáticas'],
    confidence: 0.88,
    processingTime: 12,
  });

describe('DigitalTwinController', () => {
  let controller: DigitalTwinController;
  let service: jest.Mocked<DigitalTwinService>;

  beforeEach(async () => {
    service = {
      buildTwin: jest.fn(),
      getTwin: jest.fn(),
      simulateScenario: jest.fn(),
      forecastEvolution: jest.fn(),
      getTimeline: jest.fn(),
      getSnapshots: jest.fn(),
      compare: jest.fn(),
      restoreSnapshot: jest.fn(),
      generateSnapshot: jest.fn(),
      evolveRisk: jest.fn(),
    } as unknown as jest.Mocked<DigitalTwinService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DigitalTwinController],
      providers: [{ provide: DigitalTwinService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(DigitalTwinController);
  });

  it('POST / calls buildTwin and returns result', () => {
    const twin = makeTwin();
    const snapshot = makeSnapshot();
    service.buildTwin.mockReturnValue({ twin, snapshot });

    const result = controller.buildTwin(
      {
        patientId: 'p-ctrl',
        demographics: { age: 55, sex: 'MALE' },
      } as any,
      { sub: 'user-1' },
    );

    expect(service.buildTwin).toHaveBeenCalledTimes(1);
    expect(result.twin.id).toBe('twin-ctrl-001');
  });

  it('POST simulate calls simulateScenario and returns result', () => {
    service.simulateScenario.mockReturnValue({
      scenario: makeScenario(),
      result: makeResult(),
    });

    const result = controller.simulateScenario(
      { twinId: 'twin-ctrl-001', scenarioName: 'Test', inputs: [] },
      { sub: 'u1' },
    );

    expect(service.simulateScenario).toHaveBeenCalledTimes(1);
    expect(result.result.confidence).toBe(0.88);
  });

  it('POST forecast calls forecastEvolution and returns result', () => {
    service.forecastEvolution.mockReturnValue({
      twinId: 'twin-ctrl-001',
      horizonWeeks: 52,
      trajectory: [],
      riskTrajectory: [],
      summary: 'Stable',
      assumptions: [],
      generatedAt: new Date(),
    });

    const result = controller.forecastEvolution(
      { twinId: 'twin-ctrl-001', horizonWeeks: 52 },
      { sub: 'u1' },
    );

    expect(service.forecastEvolution).toHaveBeenCalledTimes(1);
    expect(result.horizonWeeks).toBe(52);
  });

  it('GET :id calls getTwin and returns twin', () => {
    service.getTwin.mockReturnValue(makeTwin());
    const result = controller.getTwin('twin-ctrl-001', { sub: 'u1' });
    expect(service.getTwin).toHaveBeenCalledWith('twin-ctrl-001');
    expect(result.id).toBe('twin-ctrl-001');
  });

  it('GET :id/timeline calls getTimeline and returns entries', () => {
    service.getTimeline.mockReturnValue([
      { id: 'e1', timestamp: new Date(), event: 'Init', type: 'CLINICAL' },
    ]);
    const result = controller.getTimeline('twin-ctrl-001', { sub: 'u1' });
    expect(service.getTimeline).toHaveBeenCalledWith('twin-ctrl-001');
    expect(result).toHaveLength(1);
  });

  it('GET :id/snapshots calls getSnapshots and returns array', () => {
    service.getSnapshots.mockReturnValue([makeSnapshot()]);
    const result = controller.getSnapshots('twin-ctrl-001', { sub: 'u1' });
    expect(service.getSnapshots).toHaveBeenCalledWith('twin-ctrl-001');
    expect(result).toHaveLength(1);
  });

  it('POST :id/compare calls compare and returns comparison', () => {
    service.compare.mockReturnValue({
      snapshot1Id: 'snap-1',
      snapshot2Id: 'snap-2',
      timeDeltaMs: 86400000,
      biomarkerDeltas: {},
      riskScoreDeltas: {},
      improving: ['ldl'],
      worsening: [],
      stable: [],
    });

    const result = controller.compare(
      'twin-ctrl-001',
      { snapshotId1: 'snap-1', snapshotId2: 'snap-2' },
      { sub: 'u1' },
    );

    expect(service.compare).toHaveBeenCalledWith('twin-ctrl-001', {
      snapshotId1: 'snap-1',
      snapshotId2: 'snap-2',
    });
    expect(result.improving).toContain('ldl');
  });
});
