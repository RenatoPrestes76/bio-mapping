import { NotFoundException } from '@nestjs/common';
import { DigitalTwinService } from '../digital-twin.service.js';
import { DigitalTwinProvider } from '../providers/digital-twin.provider.js';
import { DigitalTwin } from '../entities/digital-twin.entity.js';
import { TwinSnapshot } from '../entities/twin-snapshot.entity.js';
import { CreateTwinDto, SimulateScenarioDto, ForecastDto, CompareDto } from '../dto/twin.dto.js';

const makeCreateDto = (): CreateTwinDto => ({
  patientId: 'p-service-test',
  demographics: { age: 58, sex: 'FEMALE', bmi: 32 },
  conditions: ['Diabetes Mellitus tipo 2', 'Hipertensão Arterial'],
  medications: ['Metformina 850mg', 'Enalapril 10mg'],
  symptoms: ['Fadiga'],
  biomarkers: [
    { name: 'fasting_glucose', value: 145 },
    { name: 'hba1c', value: 7.8 },
    { name: 'systolic_bp', value: 152 },
    { name: 'ldl', value: 158 },
  ],
  lifestyle: { smoking: false, physicalActivity: 'SEDENTARY', sleepHours: 5.5 },
  familyHistory: ['Diabetes Mellitus tipo 2'],
});

describe('DigitalTwinService', () => {
  let service: DigitalTwinService;
  let provider: DigitalTwinProvider;

  beforeEach(() => {
    provider = new DigitalTwinProvider();
    service = new DigitalTwinService(provider);
  });

  it('buildTwin creates and returns twin + snapshot', () => {
    const result = service.buildTwin(makeCreateDto());
    expect(result.twin).toBeInstanceOf(DigitalTwin);
    expect(result.snapshot).toBeInstanceOf(TwinSnapshot);
    expect(result.twin.patientId).toBe('p-service-test');
  });

  it('getTwin retrieves existing twin', () => {
    const { twin } = service.buildTwin(makeCreateDto());
    const found = service.getTwin(twin.id);
    expect(found.id).toBe(twin.id);
  });

  it('getTwin throws NotFoundException for unknown id', () => {
    expect(() => service.getTwin('nonexistent')).toThrow(NotFoundException);
  });

  it('simulateScenario runs simulation for existing twin', () => {
    const { twin } = service.buildTwin(makeCreateDto());
    const dto: SimulateScenarioDto = {
      twinId: twin.id,
      scenarioName: 'Iniciar estatina',
      inputs: [{ type: 'MEDICATION', name: 'statin', value: 'atorvastatina 40mg' }],
      expectedDurationWeeks: 8,
    };
    const { scenario, result } = service.simulateScenario(dto);
    expect(scenario.name).toBe('Iniciar estatina');
    expect(result.predictedOutcomes.length).toBeGreaterThan(0);
  });

  it('simulateScenario throws NotFoundException for unknown twinId', () => {
    const dto: SimulateScenarioDto = {
      twinId: 'nonexistent',
      scenarioName: 'Test',
      inputs: [],
    };
    expect(() => service.simulateScenario(dto)).toThrow(NotFoundException);
  });

  it('forecastEvolution generates forecast for existing twin', () => {
    const { twin } = service.buildTwin(makeCreateDto());
    const dto: ForecastDto = { twinId: twin.id, horizonWeeks: 52 };
    const forecast = service.forecastEvolution(dto);
    expect(forecast.twinId).toBe(twin.id);
    expect(forecast.horizonWeeks).toBe(52);
    expect(forecast.trajectory.length).toBeGreaterThan(0);
  });

  it('forecastEvolution clamps horizonWeeks to [4, 260]', () => {
    const { twin } = service.buildTwin(makeCreateDto());
    const short = service.forecastEvolution({ twinId: twin.id, horizonWeeks: 1 });
    expect(short.horizonWeeks).toBe(4);

    const long = service.forecastEvolution({ twinId: twin.id, horizonWeeks: 1000 });
    expect(long.horizonWeeks).toBe(260);
  });

  it('forecastEvolution throws NotFoundException for unknown twinId', () => {
    expect(() => service.forecastEvolution({ twinId: 'x', horizonWeeks: 52 })).toThrow(NotFoundException);
  });

  it('getTimeline returns timeline entries for existing twin', () => {
    const { twin } = service.buildTwin(makeCreateDto());
    const timeline = service.getTimeline(twin.id);
    expect(Array.isArray(timeline)).toBe(true);
    expect(timeline.length).toBeGreaterThan(0);
  });

  it('getTimeline throws NotFoundException for unknown twinId', () => {
    expect(() => service.getTimeline('x')).toThrow(NotFoundException);
  });

  it('getSnapshots returns snapshots for existing twin', () => {
    const { twin } = service.buildTwin(makeCreateDto());
    const snapshots = service.getSnapshots(twin.id);
    expect(snapshots.length).toBeGreaterThanOrEqual(1);
  });

  it('getSnapshots throws NotFoundException for unknown twinId', () => {
    expect(() => service.getSnapshots('x')).toThrow(NotFoundException);
  });

  it('compare throws NotFoundException for missing snapshots', () => {
    const { twin } = service.buildTwin(makeCreateDto());
    const dto: CompareDto = { snapshotId1: 'bad1', snapshotId2: 'bad2' };
    expect(() => service.compare(twin.id, dto)).toThrow(NotFoundException);
  });

  it('compare returns SnapshotComparison when both snapshots exist', () => {
    const { twin, snapshot: snap1 } = service.buildTwin(makeCreateDto());
    const snap2 = service.generateSnapshot(twin.id);
    const dto: CompareDto = { snapshotId1: snap1.id, snapshotId2: snap2.id };
    const comparison = service.compare(twin.id, dto);
    expect(comparison.snapshot1Id).toBe(snap1.id);
    expect(comparison.snapshot2Id).toBe(snap2.id);
  });

  it('restoreSnapshot restores twin clinical state', () => {
    const { twin, snapshot } = service.buildTwin(makeCreateDto());
    const restored = service.restoreSnapshot(twin.id, snapshot.id);
    expect(restored).toBeInstanceOf(DigitalTwin);
  });

  it('restoreSnapshot throws NotFoundException for unknown snapshotId', () => {
    const { twin } = service.buildTwin(makeCreateDto());
    expect(() => service.restoreSnapshot(twin.id, 'bad-snap')).toThrow(NotFoundException);
  });

  it('generateSnapshot creates a new snapshot', () => {
    const { twin } = service.buildTwin(makeCreateDto());
    const snap = service.generateSnapshot(twin.id);
    expect(snap).toBeInstanceOf(TwinSnapshot);
    expect(snap.twinId).toBe(twin.id);
  });
});
