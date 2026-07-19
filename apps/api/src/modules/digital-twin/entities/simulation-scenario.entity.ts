export enum ScenarioStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface ScenarioInput {
  type: 'MEDICATION' | 'LIFESTYLE' | 'BIOMARKER' | 'INTERVENTION';
  name: string;
  value: unknown;
  durationWeeks?: number;
}

export interface SimulationScenarioData {
  id?: string;
  twinId: string;
  name: string;
  description?: string;
  inputs: ScenarioInput[];
  assumptions?: string[];
  expectedDuration?: number;
  status?: ScenarioStatus;
  createdAt?: Date;
}

export class SimulationScenario {
  readonly id: string;
  readonly twinId: string;
  readonly name: string;
  readonly description: string;
  readonly inputs: ScenarioInput[];
  readonly assumptions: string[];
  readonly expectedDuration: number;
  readonly status: ScenarioStatus;
  readonly createdAt: Date;

  constructor(data: SimulationScenarioData) {
    this.id = data.id ?? `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.twinId = data.twinId;
    this.name = data.name;
    this.description = data.description ?? '';
    this.inputs = data.inputs;
    this.assumptions = data.assumptions ?? [];
    this.expectedDuration = data.expectedDuration ?? 12;
    this.status = data.status ?? ScenarioStatus.PENDING;
    this.createdAt = data.createdAt ?? new Date();
  }

  isCompleted(): boolean {
    return this.status === ScenarioStatus.COMPLETED;
  }

  isPending(): boolean {
    return this.status === ScenarioStatus.PENDING;
  }

  withStatus(status: ScenarioStatus): SimulationScenario {
    return new SimulationScenario({
      id: this.id,
      twinId: this.twinId,
      name: this.name,
      description: this.description,
      inputs: this.inputs,
      assumptions: this.assumptions,
      expectedDuration: this.expectedDuration,
      status,
      createdAt: this.createdAt,
    });
  }
}
