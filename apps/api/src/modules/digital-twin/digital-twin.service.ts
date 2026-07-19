import { Injectable, NotFoundException } from '@nestjs/common';
import { DigitalTwin, TimelineEntry } from './entities/digital-twin.entity.js';
import { SimulationScenario } from './entities/simulation-scenario.entity.js';
import { SimulationResult } from './entities/simulation-result.entity.js';
import { TwinSnapshot } from './entities/twin-snapshot.entity.js';
import { DigitalTwinProvider } from './providers/digital-twin.provider.js';
import { ForecastResult } from './forecast/outcome-forecast.engine.js';
import { RiskEvolution } from './engine/risk-evolution.engine.js';
import { SnapshotComparison } from './timeline/timeline.engine.js';
import {
  CreateTwinDto,
  SimulateScenarioDto,
  ForecastDto,
  CompareDto,
} from './dto/twin.dto.js';

export interface BuildTwinResult {
  twin: DigitalTwin;
  snapshot: TwinSnapshot;
}

export interface SimulationOutput {
  scenario: SimulationScenario;
  result: SimulationResult;
}

@Injectable()
export class DigitalTwinService {
  constructor(private readonly provider: DigitalTwinProvider) {}

  buildTwin(dto: CreateTwinDto): BuildTwinResult {
    return this.provider.createTwin(dto);
  }

  getTwin(id: string): DigitalTwin {
    const twin = this.provider.getTwin(id);
    if (!twin) throw new NotFoundException(`Digital Twin '${id}' not found`);
    return twin;
  }

  simulateScenario(dto: SimulateScenarioDto): SimulationOutput {
    const twin = this.getTwin(dto.twinId);
    return this.provider.simulate(twin, dto);
  }

  forecastEvolution(dto: ForecastDto): ForecastResult {
    const twin = this.getTwin(dto.twinId);
    const weeks = Math.max(4, Math.min(260, dto.horizonWeeks ?? 52));
    return this.provider.forecast(twin, weeks);
  }

  getTimeline(twinId: string): TimelineEntry[] {
    const twin = this.getTwin(twinId);
    return this.provider.getTimeline(twin);
  }

  getSnapshots(twinId: string): TwinSnapshot[] {
    this.getTwin(twinId);
    return this.provider.getSnapshots(twinId);
  }

  compare(twinId: string, dto: CompareDto): SnapshotComparison {
    this.getTwin(twinId);
    const s1 = this.provider.getSnapshot(dto.snapshotId1);
    const s2 = this.provider.getSnapshot(dto.snapshotId2);
    if (!s1) throw new NotFoundException(`Snapshot '${dto.snapshotId1}' not found`);
    if (!s2) throw new NotFoundException(`Snapshot '${dto.snapshotId2}' not found`);
    return this.provider.compareSnapshots(s1, s2);
  }

  restoreSnapshot(twinId: string, snapshotId: string): DigitalTwin {
    const twin = this.getTwin(twinId);
    const snapshot = this.provider.getSnapshot(snapshotId);
    if (!snapshot)
      throw new NotFoundException(`Snapshot '${snapshotId}' not found`);
    if (snapshot.twinId !== twinId)
      throw new NotFoundException(`Snapshot '${snapshotId}' does not belong to twin '${twinId}'`);
    return this.provider.restoreSnapshot(twin, snapshot);
  }

  evolveRisk(dto: SimulateScenarioDto): RiskEvolution {
    const twin = this.getTwin(dto.twinId);
    return this.provider.evolveRisk(twin, dto);
  }

  generateSnapshot(twinId: string): TwinSnapshot {
    const twin = this.getTwin(twinId);
    return this.provider.generateSnapshot(twin);
  }
}
