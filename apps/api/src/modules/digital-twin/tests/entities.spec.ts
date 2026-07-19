import { DigitalTwin, ClinicalState, RiskState } from '../entities/digital-twin.entity.js';
import {
  SimulationScenario,
  ScenarioStatus,
} from '../entities/simulation-scenario.entity.js';
import { SimulationResult } from '../entities/simulation-result.entity.js';
import { TwinSnapshot } from '../entities/twin-snapshot.entity.js';

const makeRiskState = (score = 30): RiskState => ({
  cardiovascularRisk: 'LOW',
  metabolicRisk: 'LOW',
  diabetesRisk: 'VERY_LOW',
  overallRisk: 'LOW',
  riskScore: score,
  lastUpdated: new Date(),
});

const makeClinicalState = (): ClinicalState => ({
  conditions: ['Hipertensão Arterial'],
  biomarkers: { fasting_glucose: 95, ldl: 120, systolic_bp: 135 },
  medications: ['Losartana 50mg'],
  symptoms: [],
  lastUpdated: new Date(),
});

describe('DigitalTwin entity', () => {
  it('creates with auto-generated id and defaults', () => {
    const twin = new DigitalTwin({
      patientId: 'p-001',
      profileSnapshot: {},
      clinicalState: makeClinicalState(),
      riskState: makeRiskState(),
    });

    expect(twin.id).toMatch(/^twin-/);
    expect(twin.patientId).toBe('p-001');
    expect(twin.version).toBe(1);
    expect(twin.timeline).toEqual([]);
    expect(twin.createdAt).toBeInstanceOf(Date);
    expect(twin.updatedAt).toBeInstanceOf(Date);
  });

  it('accepts explicit id', () => {
    const twin = new DigitalTwin({
      id: 'twin-explicit',
      patientId: 'p-002',
      profileSnapshot: {},
      clinicalState: makeClinicalState(),
      riskState: makeRiskState(),
    });
    expect(twin.id).toBe('twin-explicit');
  });

  it('addTimelineEntry returns new instance with entry appended', () => {
    const twin = new DigitalTwin({
      patientId: 'p-003',
      profileSnapshot: {},
      clinicalState: makeClinicalState(),
      riskState: makeRiskState(),
    });

    const entry = {
      id: 'e1',
      timestamp: new Date(),
      event: 'Test event',
      type: 'CLINICAL' as const,
    };

    const updated = twin.addTimelineEntry(entry);
    expect(updated.timeline).toHaveLength(1);
    expect(updated.timeline[0].event).toBe('Test event');
    expect(twin.timeline).toHaveLength(0); // immutable
  });

  it('withUpdatedState bumps version and updates clinical state', () => {
    const twin = new DigitalTwin({
      patientId: 'p-004',
      profileSnapshot: {},
      clinicalState: makeClinicalState(),
      riskState: makeRiskState(),
    });

    const updated = twin.withUpdatedState({ biomarkers: { ldl: 80 } });
    expect(updated.version).toBe(2);
    expect(updated.clinicalState.biomarkers.ldl).toBe(80);
    expect(twin.clinicalState.biomarkers.ldl).toBe(120); // immutable
  });

  it('withUpdatedState also updates risk state when provided', () => {
    const twin = new DigitalTwin({
      patientId: 'p-005',
      profileSnapshot: {},
      clinicalState: makeClinicalState(),
      riskState: makeRiskState(40),
    });

    const updated = twin.withUpdatedState({}, { riskScore: 20, overallRisk: 'VERY_LOW' });
    expect(updated.riskState.riskScore).toBe(20);
    expect(updated.riskState.overallRisk).toBe('VERY_LOW');
  });

  it('isOutdated returns true when updatedAt exceeds threshold', () => {
    const pastDate = new Date(Date.now() - 50 * 3_600_000); // 50 hours ago
    const twin = new DigitalTwin({
      patientId: 'p-006',
      profileSnapshot: {},
      clinicalState: makeClinicalState(),
      riskState: makeRiskState(),
      updatedAt: pastDate,
    });
    expect(twin.isOutdated(24)).toBe(true);
    expect(twin.isOutdated(72)).toBe(false);
  });

  it('getBiomarker returns value case-insensitively', () => {
    const twin = new DigitalTwin({
      patientId: 'p-007',
      profileSnapshot: {},
      clinicalState: makeClinicalState(),
      riskState: makeRiskState(),
    });
    expect(twin.getBiomarker('Fasting_Glucose')).toBe(95);
    expect(twin.getBiomarker('LDL')).toBe(120);
    expect(twin.getBiomarker('crp')).toBeUndefined();
  });

  it('hasCondition returns true for case-insensitive substring', () => {
    const twin = new DigitalTwin({
      patientId: 'p-008',
      profileSnapshot: {},
      clinicalState: makeClinicalState(),
      riskState: makeRiskState(),
    });
    expect(twin.hasCondition('hipertensão')).toBe(true);
    expect(twin.hasCondition('HIPERTENSÃO')).toBe(true);
    expect(twin.hasCondition('diabetes')).toBe(false);
  });
});

describe('SimulationScenario entity', () => {
  it('creates with defaults', () => {
    const scenario = new SimulationScenario({
      twinId: 't-001',
      name: 'Cessação tabágica',
      inputs: [{ type: 'LIFESTYLE', name: 'smoking', value: false }],
    });

    expect(scenario.id).toMatch(/^scenario-/);
    expect(scenario.name).toBe('Cessação tabágica');
    expect(scenario.status).toBe(ScenarioStatus.PENDING);
    expect(scenario.expectedDuration).toBe(12);
    expect(scenario.description).toBe('');
    expect(scenario.assumptions).toEqual([]);
  });

  it('isPending returns true for new scenario', () => {
    const s = new SimulationScenario({ twinId: 't', name: 'X', inputs: [] });
    expect(s.isPending()).toBe(true);
    expect(s.isCompleted()).toBe(false);
  });

  it('withStatus returns new instance with updated status', () => {
    const s = new SimulationScenario({ twinId: 't', name: 'X', inputs: [] });
    const completed = s.withStatus(ScenarioStatus.COMPLETED);
    expect(completed.isCompleted()).toBe(true);
    expect(s.isPending()).toBe(true); // immutable
  });
});

describe('SimulationResult entity', () => {
  it('clamps confidence to [0, 1]', () => {
    const r1 = new SimulationResult({
      scenarioId: 's-1',
      predictedOutcomes: [],
      riskChanges: [],
      recommendations: [],
      confidence: 1.5,
      processingTime: 10,
    });
    expect(r1.confidence).toBe(1);

    const r2 = new SimulationResult({
      scenarioId: 's-2',
      predictedOutcomes: [],
      riskChanges: [],
      recommendations: [],
      confidence: -0.5,
      processingTime: 10,
    });
    expect(r2.confidence).toBe(0);
  });

  it('hasImprovedOutcomes detects IMPROVED direction', () => {
    const r = new SimulationResult({
      scenarioId: 's-3',
      predictedOutcomes: [],
      riskChanges: [
        { riskType: 'cardiovascular', currentLevel: 'HIGH', predictedLevel: 'MODERATE', delta: -15, direction: 'IMPROVED' },
      ],
      recommendations: [],
      confidence: 0.8,
      processingTime: 5,
    });
    expect(r.hasImprovedOutcomes()).toBe(true);
    expect(r.hasWorsenedOutcomes()).toBe(false);
  });

  it('getAverageConfidence computes average over outcomes', () => {
    const r = new SimulationResult({
      scenarioId: 's-4',
      predictedOutcomes: [
        { metric: 'ldl', currentValue: 160, predictedValue: 96, timeframeWeeks: 6, confidence: 0.9 },
        { metric: 'glucose', currentValue: 110, predictedValue: 85, timeframeWeeks: 8, confidence: 0.8 },
      ],
      riskChanges: [],
      recommendations: [],
      confidence: 0.85,
      processingTime: 5,
    });
    expect(r.getAverageConfidence()).toBeCloseTo(0.85);
  });

  it('getTopRecommendations slices correctly', () => {
    const r = new SimulationResult({
      scenarioId: 's-5',
      predictedOutcomes: [],
      riskChanges: [],
      recommendations: ['A', 'B', 'C', 'D', 'E'],
      confidence: 0.8,
      processingTime: 5,
    });
    expect(r.getTopRecommendations(3)).toEqual(['A', 'B', 'C']);
    expect(r.getTopRecommendations(10)).toHaveLength(5);
  });

  it('processingTime is clamped to 0', () => {
    const r = new SimulationResult({
      scenarioId: 's-6',
      predictedOutcomes: [],
      riskChanges: [],
      recommendations: [],
      confidence: 0.7,
      processingTime: -100,
    });
    expect(r.processingTime).toBe(0);
  });
});

describe('TwinSnapshot entity', () => {
  it('creates with auto id and current timestamp', () => {
    const snap = new TwinSnapshot({
      twinId: 't-001',
      clinicalIndicators: { age: 50 },
      biomarkers: { ldl: 130, fasting_glucose: 100 },
      riskScores: { cardiovascular: 35, overall: 38 },
      lifestyleMetrics: { smoking: false },
    });

    expect(snap.id).toMatch(/^snapshot-/);
    expect(snap.twinId).toBe('t-001');
    expect(snap.timestamp).toBeInstanceOf(Date);
  });

  it('getBiomarkerValue returns value case-insensitively', () => {
    const snap = new TwinSnapshot({
      twinId: 't-002',
      clinicalIndicators: {},
      biomarkers: { LDL: 130, fasting_glucose: 100 },
      riskScores: {},
      lifestyleMetrics: {},
    });
    expect(snap.getBiomarkerValue('ldl')).toBe(130);
    expect(snap.getBiomarkerValue('FASTING_GLUCOSE')).toBe(100);
    expect(snap.getBiomarkerValue('crp')).toBeUndefined();
  });

  it('getRiskScore returns value case-insensitively', () => {
    const snap = new TwinSnapshot({
      twinId: 't-003',
      clinicalIndicators: {},
      biomarkers: {},
      riskScores: { Cardiovascular: 45, Overall: 50 },
      lifestyleMetrics: {},
    });
    expect(snap.getRiskScore('cardiovascular')).toBe(45);
    expect(snap.getRiskScore('OVERALL')).toBe(50);
    expect(snap.getRiskScore('diabetes')).toBeUndefined();
  });
});
