import { Injectable, NotFoundException } from '@nestjs/common';
import { DigitalTwin, TimelineEntry } from '../entities/digital-twin.entity.js';
import { SimulationScenario } from '../entities/simulation-scenario.entity.js';
import { SimulationResult } from '../entities/simulation-result.entity.js';
import { TwinSnapshot } from '../entities/twin-snapshot.entity.js';
import { TwinBuilderEngine } from '../engine/twin-builder.engine.js';
import { ScenarioSimulationEngine } from '../simulation/scenario-simulation.engine.js';
import { OutcomeForecastEngine, ForecastResult } from '../forecast/outcome-forecast.engine.js';
import { RiskEvolutionEngine, RiskEvolution } from '../engine/risk-evolution.engine.js';
import { TimelineEngine, SnapshotComparison } from '../timeline/timeline.engine.js';
import { CreateTwinDto, SimulateScenarioDto } from '../dto/twin.dto.js';

@Injectable()
export class DigitalTwinProvider {
  private readonly twinStore = new Map<string, DigitalTwin>();
  private readonly snapshotStore = new Map<string, TwinSnapshot>();
  private readonly snapshotsByTwin = new Map<string, string[]>();
  private readonly scenarioStore = new Map<string, SimulationScenario>();
  private readonly resultStore = new Map<string, SimulationResult>();

  private readonly twinBuilder = new TwinBuilderEngine();
  private readonly simulationEngine = new ScenarioSimulationEngine();
  private readonly forecastEngine = new OutcomeForecastEngine();
  private readonly riskEvolutionEngine = new RiskEvolutionEngine();
  private readonly timelineEngine = new TimelineEngine();

  createTwin(dto: CreateTwinDto): { twin: DigitalTwin; snapshot: TwinSnapshot } {
    const { twin, snapshot } = this.twinBuilder.build(dto);
    this.storeTwin(twin);
    this.storeSnapshot(snapshot);
    return { twin, snapshot };
  }

  getTwin(id: string): DigitalTwin | undefined {
    return this.twinStore.get(id);
  }

  simulate(
    twin: DigitalTwin,
    dto: SimulateScenarioDto,
  ): { scenario: SimulationScenario; result: SimulationResult } {
    const scenario = new SimulationScenario({
      twinId: twin.id,
      name: dto.scenarioName,
      description: dto.description,
      inputs: dto.inputs,
      assumptions: dto.assumptions ?? [],
      expectedDuration: dto.expectedDurationWeeks ?? 12,
    });

    this.scenarioStore.set(scenario.id, scenario);

    const result = this.simulationEngine.simulate(twin, scenario);
    this.resultStore.set(result.id, result);

    const snapshot = this.captureSnapshot(twin, 'SIMULATION');
    const entry: TimelineEntry = this.timelineEngine.buildEntry(
      `Simulação: ${scenario.name}`,
      'SIMULATION',
      snapshot.id,
      { scenarioId: scenario.id, resultId: result.id },
    );

    const updatedTwin = twin.addTimelineEntry(entry);
    this.storeTwin(updatedTwin);

    return { scenario, result };
  }

  forecast(twin: DigitalTwin, horizonWeeks: number): ForecastResult {
    const result = this.forecastEngine.forecast(twin, horizonWeeks);

    const entry: TimelineEntry = this.timelineEngine.buildEntry(
      `Previsão de ${horizonWeeks} semanas gerada`,
      'FORECAST',
      undefined,
      { horizonWeeks },
    );
    const updatedTwin = twin.addTimelineEntry(entry);
    this.storeTwin(updatedTwin);

    return result;
  }

  evolveRisk(twin: DigitalTwin, dto: SimulateScenarioDto): RiskEvolution {
    return this.riskEvolutionEngine.evolve(
      twin,
      dto.inputs,
      dto.expectedDurationWeeks ?? 52,
    );
  }

  getTimeline(twin: DigitalTwin): TimelineEntry[] {
    return this.timelineEngine.getSortedTimeline(twin);
  }

  getSnapshot(id: string): TwinSnapshot | undefined {
    return this.snapshotStore.get(id);
  }

  getSnapshots(twinId: string): TwinSnapshot[] {
    const ids = this.snapshotsByTwin.get(twinId) ?? [];
    return ids
      .map((id) => this.snapshotStore.get(id))
      .filter((s): s is TwinSnapshot => s !== undefined);
  }

  compareSnapshots(s1: TwinSnapshot, s2: TwinSnapshot): SnapshotComparison {
    return this.timelineEngine.compareSnapshots(s1, s2);
  }

  restoreSnapshot(twin: DigitalTwin, snapshot: TwinSnapshot): DigitalTwin {
    const restored = twin.withUpdatedState({
      biomarkers: { ...snapshot.biomarkers },
    });

    const entry: TimelineEntry = this.timelineEngine.buildEntry(
      `Estado restaurado ao snapshot de ${snapshot.timestamp.toISOString()}`,
      'CLINICAL',
      snapshot.id,
      { restoredSnapshotId: snapshot.id },
    );

    const updatedTwin = restored.addTimelineEntry(entry);
    this.storeTwin(updatedTwin);
    return updatedTwin;
  }

  generateSnapshot(twin: DigitalTwin): TwinSnapshot {
    const snapshot = this.captureSnapshot(twin, 'manual');
    const entry: TimelineEntry = this.timelineEngine.buildEntry(
      'Snapshot manual criado',
      'SNAPSHOT',
      snapshot.id,
    );
    const updatedTwin = twin.addTimelineEntry(entry);
    this.storeTwin(updatedTwin);
    return snapshot;
  }

  twinCount(): number {
    return this.twinStore.size;
  }

  snapshotCount(): number {
    return this.snapshotStore.size;
  }

  scenarioCount(): number {
    return this.scenarioStore.size;
  }

  resultCount(): number {
    return this.resultStore.size;
  }

  private captureSnapshot(twin: DigitalTwin, source: string): TwinSnapshot {
    const snapshot = new TwinSnapshot({
      twinId: twin.id,
      clinicalIndicators: {
        version: twin.version,
        source,
        conditionCount: twin.clinicalState.conditions.length,
        medicationCount: twin.clinicalState.medications.length,
      },
      biomarkers: { ...twin.clinicalState.biomarkers },
      riskScores: {
        cardiovascular: twin.riskState.riskScore,
        metabolic: Math.max(0, twin.riskState.riskScore - 5),
        overall: twin.riskState.riskScore,
      },
      lifestyleMetrics: {},
    });
    this.storeSnapshot(snapshot);
    return snapshot;
  }

  private storeTwin(twin: DigitalTwin): void {
    this.twinStore.set(twin.id, twin);
  }

  private storeSnapshot(snapshot: TwinSnapshot): void {
    this.snapshotStore.set(snapshot.id, snapshot);
    const list = this.snapshotsByTwin.get(snapshot.twinId) ?? [];
    if (!list.includes(snapshot.id)) {
      list.push(snapshot.id);
      this.snapshotsByTwin.set(snapshot.twinId, list);
    }
  }
}
