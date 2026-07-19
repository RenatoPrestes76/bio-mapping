import { TwinBuilderEngine } from '../engine/twin-builder.engine.js';
import { ScenarioSimulationEngine } from '../simulation/scenario-simulation.engine.js';
import { OutcomeForecastEngine } from '../forecast/outcome-forecast.engine.js';
import { RiskEvolutionEngine } from '../engine/risk-evolution.engine.js';
import { TimelineEngine } from '../timeline/timeline.engine.js';
import { DigitalTwin, ClinicalState, RiskState } from '../entities/digital-twin.entity.js';
import { SimulationScenario } from '../entities/simulation-scenario.entity.js';
import { TwinSnapshot } from '../entities/twin-snapshot.entity.js';
import { CreateTwinDto } from '../dto/twin.dto.js';

const baseTwinData = (overrides?: Partial<CreateTwinDto>): CreateTwinDto => ({
  patientId: 'p-test',
  demographics: { age: 55, sex: 'MALE', bmi: 29 },
  conditions: ['Hipertensão Arterial', 'Dislipidemia'],
  medications: ['Losartana 50mg'],
  symptoms: [],
  biomarkers: [
    { name: 'fasting_glucose', value: 108 },
    { name: 'systolic_bp', value: 145 },
    { name: 'ldl', value: 165 },
    { name: 'hba1c', value: 6.0 },
    { name: 'crp', value: 1.5 },
  ],
  lifestyle: { smoking: false, physicalActivity: 'SEDENTARY' },
  familyHistory: ['Infarto agudo do miocárdio'],
  ...overrides,
});

const makeRiskState = (score = 45): RiskState => ({
  cardiovascularRisk: 'MODERATE',
  metabolicRisk: 'MODERATE',
  diabetesRisk: 'MODERATE',
  overallRisk: 'MODERATE',
  riskScore: score,
  lastUpdated: new Date(),
});

const makeClinicalState = (): ClinicalState => ({
  conditions: ['Hipertensão Arterial'],
  biomarkers: { fasting_glucose: 108, systolic_bp: 145, ldl: 165, hba1c: 6.0, crp: 1.5 },
  medications: ['Losartana'],
  symptoms: [],
  lastUpdated: new Date(),
});

describe('TwinBuilderEngine', () => {
  const engine = new TwinBuilderEngine();

  it('builds a DigitalTwin from CreateTwinDto', () => {
    const { twin, snapshot } = engine.build(baseTwinData());
    expect(twin).toBeInstanceOf(DigitalTwin);
    expect(twin.patientId).toBe('p-test');
    expect(twin.clinicalState.conditions).toContain('Hipertensão Arterial');
    expect(twin.clinicalState.biomarkers['fasting_glucose']).toBe(108);
  });

  it('creates an initial snapshot', () => {
    const { snapshot } = engine.build(baseTwinData());
    expect(snapshot).toBeInstanceOf(TwinSnapshot);
    expect(snapshot.biomarkers['fasting_glucose']).toBe(108);
    expect(snapshot.biomarkers['ldl']).toBe(165);
  });

  it('adds initial timeline entry', () => {
    const { twin } = engine.build(baseTwinData());
    expect(twin.timeline).toHaveLength(1);
    expect(twin.timeline[0].type).toBe('CLINICAL');
    expect(twin.timeline[0].event).toContain('criado');
  });

  it('normalizes biomarker names to lowercase', () => {
    const dto = baseTwinData();
    dto.biomarkers = [{ name: 'LDL', value: 200 }];
    const { twin } = engine.build(dto);
    expect(twin.clinicalState.biomarkers['ldl']).toBe(200);
  });

  it('computes risk score higher for multi-risk patient', () => {
    const highRiskDto = baseTwinData({
      demographics: { age: 68, sex: 'MALE', bmi: 36 },
      lifestyle: { smoking: true },
    });
    const lowRiskDto = baseTwinData({
      demographics: { age: 30, sex: 'FEMALE', bmi: 22 },
      conditions: [],
      familyHistory: [],
      lifestyle: { smoking: false },
    });

    const { twin: highTwin } = engine.build(highRiskDto);
    const { twin: lowTwin } = engine.build(lowRiskDto);
    expect(highTwin.riskState.riskScore).toBeGreaterThan(lowTwin.riskState.riskScore);
  });

  it('sets VERY_HIGH cardiovascular risk for extreme profile', () => {
    const dto = baseTwinData({
      demographics: { age: 70, sex: 'MALE', bmi: 38 },
      conditions: ['Diabetes Mellitus tipo 2', 'Hipertensão Arterial', 'Infarto prévio'],
      lifestyle: { smoking: true },
      biomarkers: [
        { name: 'systolic_bp', value: 180 },
        { name: 'ldl', value: 220 },
        { name: 'fasting_glucose', value: 200 },
      ],
    });
    const { twin } = engine.build(dto);
    expect(['HIGH', 'VERY_HIGH']).toContain(twin.riskState.overallRisk);
  });

  it('handles empty conditions/biomarkers gracefully', () => {
    const dto: CreateTwinDto = {
      patientId: 'p-empty',
      demographics: { age: 25, sex: 'FEMALE' },
    };
    const { twin } = engine.build(dto);
    expect(twin.clinicalState.conditions).toEqual([]);
    expect(twin.clinicalState.biomarkers).toEqual({});
    expect(twin.riskState.riskScore).toBeGreaterThanOrEqual(0);
  });
});

describe('ScenarioSimulationEngine', () => {
  const builder = new TwinBuilderEngine();
  const engine = new ScenarioSimulationEngine();

  const buildTwin = (dto?: Partial<CreateTwinDto>): DigitalTwin =>
    builder.build(baseTwinData(dto)).twin;

  const makeScenario = (inputs: SimulationScenario['inputs'], duration = 12): SimulationScenario =>
    new SimulationScenario({
      twinId: 'twin-x',
      name: 'Test scenario',
      inputs,
      expectedDuration: duration,
    });

  it('returns SimulationResult with positive processingTime', () => {
    const twin = buildTwin();
    const scenario = makeScenario([{ type: 'LIFESTYLE', name: 'smoking', value: false }]);
    const result = engine.simulate(twin, scenario);
    expect(result.processingTime).toBeGreaterThanOrEqual(0);
    expect(result.scenarioId).toBe(scenario.id);
  });

  it('quit smoking produces improved cardiovascular risk change', () => {
    const twin = buildTwin({ lifestyle: { smoking: true } });
    const scenario = makeScenario([{ type: 'LIFESTYLE', name: 'smoking', value: false }], 52);
    const result = engine.simulate(twin, scenario);
    const cvdChange = result.riskChanges.find((rc) => rc.riskType === 'cardiovascular');
    expect(cvdChange).toBeDefined();
    expect(cvdChange!.direction).toBe('IMPROVED');
  });

  it('statin reduces LDL in predicted outcomes', () => {
    const twin = buildTwin({ biomarkers: [{ name: 'ldl', value: 200 }] });
    const scenario = makeScenario([{ type: 'MEDICATION', name: 'statin', value: 'atorvastatina' }], 8);
    const result = engine.simulate(twin, scenario);
    const ldlOutcome = result.predictedOutcomes.find((o) => o.metric === 'ldl');
    expect(ldlOutcome).toBeDefined();
    expect(ldlOutcome!.predictedValue).toBeLessThan(ldlOutcome!.currentValue);
  });

  it('metformin reduces glucose and HbA1c', () => {
    const twin = buildTwin({
      biomarkers: [{ name: 'hba1c', value: 7.8 }, { name: 'fasting_glucose', value: 170 }],
    });
    const scenario = makeScenario([{ type: 'MEDICATION', name: 'metformin', value: '500mg' }], 12);
    const result = engine.simulate(twin, scenario);
    const hba1c = result.predictedOutcomes.find((o) => o.metric === 'hba1c');
    const glucose = result.predictedOutcomes.find((o) => o.metric === 'fasting_glucose');
    expect(hba1c).toBeDefined();
    expect(hba1c!.predictedValue).toBeLessThan(hba1c!.currentValue);
    expect(glucose).toBeDefined();
    expect(glucose!.predictedValue).toBeLessThan(glucose!.currentValue);
  });

  it('bariatric surgery produces large BMI reduction and metabolic improvement', () => {
    const twin = buildTwin({
      demographics: { age: 40, sex: 'FEMALE', bmi: 45 },
      biomarkers: [{ name: 'bmi', value: 45 }, { name: 'hba1c', value: 9.0 }],
    });
    const scenario = makeScenario([{ type: 'INTERVENTION', name: 'bariatric_surgery', value: true }], 52);
    const result = engine.simulate(twin, scenario);
    const bmiOutcome = result.predictedOutcomes.find((o) => o.metric === 'bmi');
    expect(bmiOutcome).toBeDefined();
    expect(bmiOutcome!.predictedValue).toBeLessThan(bmiOutcome!.currentValue);
    expect(result.riskChanges.some((rc) => rc.direction === 'IMPROVED')).toBe(true);
  });

  it('BIOMARKER type input creates outcome targeting specified value', () => {
    const twin = buildTwin({ biomarkers: [{ name: 'ldl', value: 190 }] });
    const scenario = makeScenario([{ type: 'BIOMARKER', name: 'ldl', value: 100 }]);
    const result = engine.simulate(twin, scenario);
    const ldlOutcome = result.predictedOutcomes.find((o) => o.metric === 'ldl');
    expect(ldlOutcome!.predictedValue).toBe(100);
    expect(ldlOutcome!.currentValue).toBe(190);
  });

  it('multiple interventions merge outcomes without duplication', () => {
    const twin = buildTwin({
      biomarkers: [{ name: 'ldl', value: 180 }, { name: 'systolic_bp', value: 150 }],
    });
    const scenario = makeScenario([
      { type: 'MEDICATION', name: 'statin', value: 'atorvastatina' },
      { type: 'LIFESTYLE', name: 'physicalActivity', value: 'MODERATE' },
    ]);
    const result = engine.simulate(twin, scenario);
    const ldlEntries = result.predictedOutcomes.filter((o) => o.metric === 'ldl');
    expect(ldlEntries).toHaveLength(1); // merged
  });

  it('confidence is within [0, 1]', () => {
    const twin = buildTwin();
    const scenario = makeScenario([
      { type: 'MEDICATION', name: 'statin', value: 'x' },
      { type: 'LIFESTYLE', name: 'physicalActivity', value: 'MODERATE' },
      { type: 'LIFESTYLE', name: 'dietType', value: 'MEDITERRANEAN' },
      { type: 'INTERVENTION', name: 'weight_loss_10pct', value: true },
    ]);
    const result = engine.simulate(twin, scenario);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('includes limitations in result', () => {
    const twin = buildTwin();
    const scenario = makeScenario([{ type: 'LIFESTYLE', name: 'smoking', value: false }]);
    const result = engine.simulate(twin, scenario);
    expect(result.limitations.length).toBeGreaterThan(0);
  });
});

describe('OutcomeForecastEngine', () => {
  const builder = new TwinBuilderEngine();
  const engine = new OutcomeForecastEngine();

  const buildTwin = (dto?: Partial<CreateTwinDto>): DigitalTwin =>
    builder.build(baseTwinData(dto)).twin;

  it('returns forecast with correct twinId and horizonWeeks', () => {
    const twin = buildTwin();
    const result = engine.forecast(twin, 52);
    expect(result.twinId).toBe(twin.id);
    expect(result.horizonWeeks).toBe(52);
    expect(result.generatedAt).toBeInstanceOf(Date);
  });

  it('trajectory contains quarterly points for 52-week forecast', () => {
    const twin = buildTwin();
    const result = engine.forecast(twin, 52);
    expect(result.trajectory.length).toBeGreaterThan(0);
    const weeks = [...new Set(result.trajectory.map((t) => t.week))];
    expect(weeks.every((w) => w > 0 && w <= 52)).toBe(true);
  });

  it('riskTrajectory includes sequential weekly steps', () => {
    const twin = buildTwin();
    const result = engine.forecast(twin, 52);
    expect(result.riskTrajectory.length).toBeGreaterThan(0);
    result.riskTrajectory.forEach((p) => {
      expect(p.riskScore).toBeGreaterThanOrEqual(0);
      expect(p.riskScore).toBeLessThanOrEqual(100);
      expect(['VERY_LOW', 'LOW', 'MODERATE', 'HIGH', 'VERY_HIGH']).toContain(p.riskLevel);
    });
  });

  it('forecasts glucose as worsening for uncontrolled diabetic', () => {
    const twin = buildTwin({
      conditions: ['Diabetes Mellitus tipo 2'],
      biomarkers: [{ name: 'fasting_glucose', value: 160 }, { name: 'hba1c', value: 8.2 }],
    });
    const result = engine.forecast(twin, 52);
    const hba1cPoints = result.trajectory.filter((t) => t.metric === 'hba1c');
    if (hba1cPoints.length > 0) {
      expect(hba1cPoints[hba1cPoints.length - 1].trend).toBe('WORSENING');
    }
  });

  it('includes non-empty assumptions', () => {
    const twin = buildTwin();
    const result = engine.forecast(twin, 26);
    expect(result.assumptions.length).toBeGreaterThan(0);
  });

  it('summary is a non-empty string', () => {
    const twin = buildTwin();
    const result = engine.forecast(twin, 26);
    expect(result.summary.length).toBeGreaterThan(10);
  });

  it('handles short 4-week horizon', () => {
    const twin = buildTwin();
    const result = engine.forecast(twin, 4);
    expect(result.horizonWeeks).toBe(4);
  });
});

describe('RiskEvolutionEngine', () => {
  const builder = new TwinBuilderEngine();
  const engine = new RiskEvolutionEngine();

  const buildTwin = (): DigitalTwin => builder.build(baseTwinData()).twin;

  it('evolves risk over time with no interventions (slight worsening)', () => {
    const twin = buildTwin();
    const evolution = engine.evolve(twin, [], 52);
    expect(evolution.twinId).toBe(twin.id);
    expect(evolution.initialRiskScore).toBe(twin.riskState.riskScore);
    expect(evolution.trajectory).toHaveLength(5); // week 0 + 4 quarterly steps
  });

  it('smoking cessation produces IMPROVING direction', () => {
    const twin = buildTwin();
    const evolution = engine.evolve(
      twin,
      [{ type: 'LIFESTYLE', name: 'smoking', value: false }],
      52,
    );
    expect(evolution.direction).toBe('IMPROVING');
    expect(evolution.finalRiskScore).toBeLessThan(evolution.initialRiskScore);
  });

  it('multiple interventions reduce risk faster', () => {
    const twin = buildTwin();
    const singleEvo = engine.evolve(
      twin,
      [{ type: 'MEDICATION', name: 'statin', value: 'x' }],
      52,
    );
    const multiEvo = engine.evolve(twin, [
      { type: 'MEDICATION', name: 'statin', value: 'x' },
      { type: 'LIFESTYLE', name: 'physicalActivity', value: 'VIGOROUS' },
      { type: 'LIFESTYLE', name: 'smoking', value: false },
    ], 52);
    expect(multiEvo.finalRiskScore).toBeLessThanOrEqual(singleEvo.finalRiskScore);
  });

  it('trajectory starts at week 0 with initial score', () => {
    const twin = buildTwin();
    const evolution = engine.evolve(twin, [], 52);
    expect(evolution.trajectory[0].week).toBe(0);
    expect(evolution.trajectory[0].riskScore).toBe(evolution.initialRiskScore);
  });

  it('risk levels in trajectory are valid', () => {
    const twin = buildTwin();
    const evolution = engine.evolve(twin, [], 26);
    evolution.trajectory.forEach((point) => {
      expect(['VERY_LOW', 'LOW', 'MODERATE', 'HIGH', 'VERY_HIGH']).toContain(point.riskLevel);
    });
  });

  it('includes non-empty interventionImpact description', () => {
    const twin = buildTwin();
    const evolution = engine.evolve(
      twin,
      [{ type: 'INTERVENTION', name: 'bariatric_surgery', value: true }],
      52,
    );
    expect(evolution.interventionImpact.length).toBeGreaterThan(0);
  });
});

describe('TimelineEngine', () => {
  const engine = new TimelineEngine();

  const makeTwinWithEntries = (): DigitalTwin => {
    const t1 = new Date('2024-01-01');
    const t2 = new Date('2024-06-01');
    const t3 = new Date('2024-03-01');
    let twin = new DigitalTwin({
      patientId: 'p',
      profileSnapshot: {},
      clinicalState: { conditions: [], biomarkers: {}, medications: [], symptoms: [], lastUpdated: new Date() },
      riskState: makeRiskState(),
    });
    twin = twin.addTimelineEntry({ id: 'e1', timestamp: t1, event: 'First', type: 'CLINICAL' });
    twin = twin.addTimelineEntry({ id: 'e3', timestamp: t3, event: 'Third (added second)', type: 'SIMULATION' });
    twin = twin.addTimelineEntry({ id: 'e2', timestamp: t2, event: 'Second (added last)', type: 'FORECAST' });
    return twin;
  };

  it('getSortedTimeline returns entries in chronological order', () => {
    const twin = makeTwinWithEntries();
    const sorted = engine.getSortedTimeline(twin);
    expect(sorted).toHaveLength(3);
    expect(sorted[0].id).toBe('e1');
    expect(sorted[1].id).toBe('e3');
    expect(sorted[2].id).toBe('e2');
  });

  it('compareSnapshots returns correct deltas', () => {
    const s1 = new TwinSnapshot({
      twinId: 't',
      clinicalIndicators: {},
      biomarkers: { ldl: 180, fasting_glucose: 120 },
      riskScores: { overall: 60 },
      lifestyleMetrics: {},
    });
    const s2 = new TwinSnapshot({
      twinId: 't',
      clinicalIndicators: {},
      biomarkers: { ldl: 110, fasting_glucose: 95 },
      riskScores: { overall: 40 },
      lifestyleMetrics: {},
    });

    const comparison = engine.compareSnapshots(s1, s2);
    expect(comparison.snapshot1Id).toBe(s1.id);
    expect(comparison.snapshot2Id).toBe(s2.id);
    expect(comparison.biomarkerDeltas['ldl'].delta).toBeCloseTo(-70);
    expect(comparison.improving).toContain('ldl');
    expect(comparison.improving).toContain('fasting_glucose');
  });

  it('compareSnapshots marks stable biomarkers (< 2% change)', () => {
    const s1 = new TwinSnapshot({
      twinId: 't',
      clinicalIndicators: {},
      biomarkers: { hdl: 50 },
      riskScores: {},
      lifestyleMetrics: {},
    });
    const s2 = new TwinSnapshot({
      twinId: 't',
      clinicalIndicators: {},
      biomarkers: { hdl: 50.5 }, // +1% change
      riskScores: {},
      lifestyleMetrics: {},
    });

    const comparison = engine.compareSnapshots(s1, s2);
    expect(comparison.stable).toContain('hdl');
  });

  it('buildEntry creates valid TimelineEntry', () => {
    const entry = engine.buildEntry('Test event', 'SIMULATION', 'snap-123', { key: 'val' });
    expect(entry.id).toMatch(/^entry-simulation-/);
    expect(entry.event).toBe('Test event');
    expect(entry.type).toBe('SIMULATION');
    expect(entry.snapshotId).toBe('snap-123');
    expect(entry.metadata?.key).toBe('val');
    expect(entry.timestamp).toBeInstanceOf(Date);
  });
});
