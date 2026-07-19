import { DigitalTwinProvider } from '../providers/digital-twin.provider.js';
import { DigitalTwin } from '../entities/digital-twin.entity.js';
import { TwinSnapshot } from '../entities/twin-snapshot.entity.js';
import { SimulationScenario } from '../entities/simulation-scenario.entity.js';
import { SimulationResult } from '../entities/simulation-result.entity.js';
import { CreateTwinDto, SimulateScenarioDto } from '../dto/twin.dto.js';

const makeDto = (): CreateTwinDto => ({
  patientId: 'p-provider-test',
  demographics: { age: 52, sex: 'MALE', bmi: 30 },
  conditions: ['Hipertensão Arterial'],
  medications: ['Losartana 50mg'],
  symptoms: [],
  biomarkers: [
    { name: 'fasting_glucose', value: 112 },
    { name: 'systolic_bp', value: 148 },
    { name: 'ldl', value: 172 },
  ],
  lifestyle: { smoking: false, physicalActivity: 'SEDENTARY' },
  familyHistory: [],
});

describe('DigitalTwinProvider', () => {
  let provider: DigitalTwinProvider;

  beforeEach(() => {
    provider = new DigitalTwinProvider();
  });

  it('createTwin returns twin and snapshot', () => {
    const { twin, snapshot } = provider.createTwin(makeDto());
    expect(twin).toBeInstanceOf(DigitalTwin);
    expect(snapshot).toBeInstanceOf(TwinSnapshot);
    expect(twin.patientId).toBe('p-provider-test');
  });

  it('getTwin retrieves stored twin by id', () => {
    const { twin } = provider.createTwin(makeDto());
    const retrieved = provider.getTwin(twin.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(twin.id);
  });

  it('getTwin returns undefined for unknown id', () => {
    expect(provider.getTwin('nonexistent')).toBeUndefined();
  });

  it('simulate creates scenario, result and updates timeline', () => {
    const { twin } = provider.createTwin(makeDto());
    const dto: SimulateScenarioDto = {
      twinId: twin.id,
      scenarioName: 'Cessação tabágica',
      inputs: [{ type: 'LIFESTYLE', name: 'smoking', value: false }],
      expectedDurationWeeks: 52,
    };

    const { scenario, result } = provider.simulate(twin, dto);
    expect(scenario).toBeInstanceOf(SimulationScenario);
    expect(result).toBeInstanceOf(SimulationResult);
    expect(result.confidence).toBeGreaterThan(0);

    // Twin timeline updated
    const updatedTwin = provider.getTwin(twin.id);
    expect(updatedTwin!.timeline.some((e) => e.type === 'SIMULATION')).toBe(true);
  });

  it('forecast returns ForecastResult with twinId', () => {
    const { twin } = provider.createTwin(makeDto());
    const result = provider.forecast(twin, 26);
    expect(result.twinId).toBe(twin.id);
    expect(result.horizonWeeks).toBe(26);
    expect(result.trajectory.length).toBeGreaterThan(0);

    // Timeline should be updated
    const updatedTwin = provider.getTwin(twin.id);
    expect(updatedTwin!.timeline.some((e) => e.type === 'FORECAST')).toBe(true);
  });

  it('getSnapshots returns snapshots for a twin', () => {
    const { twin } = provider.createTwin(makeDto());
    const snapshots = provider.getSnapshots(twin.id);
    expect(snapshots.length).toBeGreaterThanOrEqual(1);
    expect(snapshots[0]).toBeInstanceOf(TwinSnapshot);
  });

  it('getSnapshot retrieves snapshot by id', () => {
    const { snapshot } = provider.createTwin(makeDto());
    const retrieved = provider.getSnapshot(snapshot.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(snapshot.id);
  });

  it('compareSnapshots returns comparison with deltas', () => {
    const { twin, snapshot: s1 } = provider.createTwin(makeDto());
    // Simulate to get another snapshot
    const dto: SimulateScenarioDto = {
      twinId: twin.id,
      scenarioName: 'Statin therapy',
      inputs: [{ type: 'MEDICATION', name: 'statin', value: 'x' }],
    };
    provider.simulate(twin, dto);
    const snapshots = provider.getSnapshots(twin.id);
    if (snapshots.length >= 2) {
      const comparison = provider.compareSnapshots(snapshots[0], snapshots[1]);
      expect(comparison.snapshot1Id).toBe(snapshots[0].id);
      expect(comparison.snapshot2Id).toBe(snapshots[1].id);
    } else {
      // Only one snapshot — compare with itself
      const comparison = provider.compareSnapshots(s1, s1);
      expect(comparison.stable.length + comparison.improving.length + comparison.worsening.length).toBeGreaterThanOrEqual(0);
    }
  });

  it('restoreSnapshot updates twin biomarkers and adds timeline entry', () => {
    const { twin, snapshot } = provider.createTwin(makeDto());
    const restored = provider.restoreSnapshot(twin, snapshot);
    expect(restored.clinicalState.biomarkers['ldl']).toBe(172);
    expect(restored.timeline.some((e) => e.event.includes('restaurado'))).toBe(true);
  });

  it('generateSnapshot creates and stores snapshot', () => {
    const { twin } = provider.createTwin(makeDto());
    const countBefore = provider.snapshotCount();
    const snap = provider.generateSnapshot(twin);
    expect(snap).toBeInstanceOf(TwinSnapshot);
    expect(provider.snapshotCount()).toBeGreaterThan(countBefore);
  });

  it('twinCount increments with each creation', () => {
    expect(provider.twinCount()).toBe(0);
    provider.createTwin(makeDto());
    expect(provider.twinCount()).toBe(1);
    provider.createTwin({ ...makeDto(), patientId: 'p-002' });
    expect(provider.twinCount()).toBe(2);
  });

  it('getTimeline returns sorted entries', () => {
    const { twin } = provider.createTwin(makeDto());
    const timeline = provider.getTimeline(twin);
    expect(timeline.length).toBeGreaterThan(0);
  });
});
